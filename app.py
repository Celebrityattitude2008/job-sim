import sys

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import os
from datetime import datetime
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Production config
app.config['ENV'] = os.getenv('FLASK_ENV', 'production')
app.config['DEBUG'] = app.config['ENV'] != 'production'

# Enable CORS for Vercel with specific methods and headers
CORS(app, resources={r"/*": {
    "origins": ["https://jobsim-ten.vercel.app", "http://localhost:3000", "http://localhost:8000"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

# ============ PRODUCTION ENVIRONMENT VARIABLES ============
# Get configuration from environment variables
APP_URL = os.getenv('APP_URL', 'https://jobsim-ten.vercel.app')
SUPPORT_EMAIL = os.getenv('SUPPORT_EMAIL', 'support@jobsim.app')

# ============ DATABASE CONFIGURATION ============
# Get the absolute path to the folder where app.py lives (for portability)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, 'jobsim.db')
DB_PATH = os.getenv('DB_PATH', DEFAULT_DB_PATH)
# Fallback to PythonAnywhere path if the local file doesn't exist
if not os.path.exists(DB_PATH):
    DB_PATH = '/home/JobSim/jobsim.db'

def get_db_connection():
    """Get a database connection using absolute path."""
    # Use the absolute path to avoid "database not found" errors
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with proper tables."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            # Database tables will be created silently
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    field_of_study TEXT NOT NULL,
                    current_day INTEGER DEFAULT 1,
                    age INTEGER DEFAULT 0,
                    money INTEGER DEFAULT 150000,
                    stress INTEGER DEFAULT 20,
                    growth INTEGER DEFAULT 0,
                    health INTEGER DEFAULT 100,
                    happiness INTEGER DEFAULT 100,
                    smarts INTEGER DEFAULT 50,
                    looks INTEGER DEFAULT 50,
                    game_completed INTEGER DEFAULT 0,
                    total_games_played INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Achievements table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    achievement_name TEXT NOT NULL,
                    achievement_icon TEXT NOT NULL,
                    achievement_description TEXT NOT NULL,
                    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(user_id, achievement_name)
                )
            ''')
            
            # User settings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    sound_enabled INTEGER DEFAULT 1,
                    notifications_enabled INTEGER DEFAULT 1,
                    difficulty TEXT DEFAULT 'normal',
                    theme TEXT DEFAULT 'dark',
                    language TEXT DEFAULT 'en',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(user_id)
                )
            ''')
            
            conn.commit()
        
        # ============ DATABASE MIGRATION ============
        # Add new columns for Life Simulator if they don't exist
        cursor = conn.cursor()
        migration_columns = {
            'age': 'INTEGER DEFAULT 0',
            'health': 'INTEGER DEFAULT 100',
            'happiness': 'INTEGER DEFAULT 100',
            'smarts': 'INTEGER DEFAULT 50',
            'looks': 'INTEGER DEFAULT 50'
        }
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = {row[1] for row in cursor.fetchall()}
        
        # Add missing columns
        for col_name, col_definition in migration_columns.items():
            if col_name not in existing_columns:
                try:
                    cursor.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_definition}')
                    print(f"[MIGRATION] Added column {col_name} to users table", file=sys.stderr)
                    conn.commit()
                except sqlite3.OperationalError as e:
                    print(f"[MIGRATION] Failed to add column {col_name}: {e}", file=sys.stderr)
        
        conn.close()
    except Exception as e:
        raise

# Initialize database on startup
init_db()

# ============ SENDGRID EMAIL CONFIGURATION ============
def send_welcome_email(user_email, user_name, user_field):
    """
    Send a welcome email to new JobSim users.
    
    ENVIRONMENT VARIABLES REQUIRED:
    - SENDGRID_API_KEY: Your SendGrid API key
    - SENDGRID_FROM_EMAIL: Verified sender email (set in PythonAnywhere Environment Variables)
    
    On PythonAnywhere: Go to Web tab > Environmental Variables > Add:
    - Key: SENDGRID_API_KEY, Value: SG.xxxxx...
    - Key: SENDGRID_FROM_EMAIL, Value: support@jobsim.app (or any verified sender)
    
    CRITICAL FIX: The from_email MUST be a verified sender in SendGrid or emails go straight to spam!
    Verify at: https://app.sendgrid.com/settings/sender_auth/senders
    """
    try:
        # Get API key from environment variable
        SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
        FROM_EMAIL = os.getenv('SENDGRID_FROM_EMAIL')
        
        if not SENDGRID_API_KEY:
            error_msg = "SENDGRID_API_KEY not configured. Set in PythonAnywhere Web > Environmental Variables"
            return False
            
        if not FROM_EMAIL:
            error_msg = "SENDGRID_FROM_EMAIL not configured. Must set in PythonAnywhere Web > Environmental Variables"
            return False
        
        # Extract first name
        first_name = user_name.split(' ')[0] if user_name else 'Player'
        
        # Plain text version - professional, no spammy keywords
        plain_text = f"""Welcome to JobSim, {first_name}!

You've officially signed up as a {user_field} professional on JobSim.

Your 30-day journey in the Nigerian labor market starts now. Build your career, manage your finances, and navigate real-world challenges.

Start Game: {APP_URL}

Getting Started:
- Budget your Naira carefully
- Monitor your stress levels
- Make strategic career decisions
- Learn from each scenario

---

JobSim Labs Nigeria
{SUPPORT_EMAIL}

To manage your notification preferences, visit:
{APP_URL}

If you wish to stop receiving game emails, reply with "Stop" or visit preferences above.
"""
        
        # Professional, spam-filter-friendly HTML
        html_content = f"""
<html>
<body style="font-family: sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <h1 style="color: #2e7d32; font-size: 24px; margin-bottom: 10px;">
            Welcome to JobSim, {first_name}!
        </h1>
        
        <p style="line-height: 1.6; margin: 15px 0;">
            You've officially signed up as a <strong>{user_field}</strong> professional on JobSim.
        </p>
        
        <p style="line-height: 1.6; margin: 15px 0;">
            Your 30-day journey in the Nigerian labor market starts now. Build your career, manage your finances, and navigate real-world challenges.
        </p>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="{APP_URL}" style="background-color: #FF6B35; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Start Game
            </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
        
        <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 15px 0;">
            <strong>Getting Started:</strong><br>
            Budget your Naira carefully<br>
            Monitor your stress levels<br>
            Make strategic career decisions<br>
            Learn from each scenario
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
        
        <p style="font-size: 12px; color: #888; line-height: 1.6; margin: 15px 0;">
            <strong>JobSim Labs Nigeria</strong><br>
            <br>
            Questions? Contact us at {SUPPORT_EMAIL}<br>
            <br>
            <a href="{APP_URL}" style="color: #FF6B35; text-decoration: none; font-size: 11px;">
                Update notification preferences
            </a>
        </p>
    </div>
</body>
</html>
        """
        
        # Create message with plain text alternative (reduces spam score)
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=user_email,
            subject=f'Welcome to JobSim',  # Professional, no exclamation - reduces spam risk
            plain_text_content=plain_text,  # Plain text fallback
            html_content=html_content
        )
        
        # Send via SendGrid
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        # Check response (202 = accepted by SendGrid)
        success = response.status_code == 202
        
        if success:
            pass  # Email sent successfully
        
        return success
        
    except Exception as e:
        error_msg = str(e)
        return False

# ============ AUTHENTICATION HELPER ============
def verify_user_exists(user_id):
    """
    Verify that a user exists in the database.
    Returns the user object if found, None otherwise.
    """
    try:
        if not user_id:
            return None
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        return user
    except Exception as e:
        return None

# ============ SCENARIO DATABASE ============
# IMPORTANT: This is the ONLY location where scenarios are defined
# All frontend requests for scenarios must go through:
#   - @app.route('/get-scenarios') for fetching by field
#   - @app.route('/api/scenario') for fetching by user
# DO NOT define scenarios anywhere else
# 10 Fields × 15 Scenarios = 150 Total Unique Scenarios
# Organized by: field -> [scenario1, scenario2, ..., scenario15]
# Day fields REMOVED, optionC ADDED to all scenarios, businessGrowth added to all impacts
MASTER_SCENARIOS = {
    'Medicine': [
        {
            'text': '🏥 The Call: Your medical school debt is ₦8M. Your first patient is a woman who says "Doctor, all the big hospitals dont know my problem, so I came to a young doctor." You diagnose a simple UTI in 2 minutes. She refuses treatment and insists on expensive IV fluids.',
            'optionA': {'text': 'Insist on proper diagnosis and treatment', 'impacts': {'money': 0, 'stress': -5, 'businessGrowth': 0}},
            'optionB': {'text': 'Give her the IV fluids to keep her happy', 'impacts': {'money': 15000, 'stress': 10, 'businessGrowth': 5}},
            'optionC': {'text': 'Explain clearly but offer a middle ground treatment', 'impacts': {'money': 5000, 'stress': 0, 'businessGrowth': 3}}
        },
        {
            'text': '⚕️ The Emergency: NEPA just took light from the hospital ward. Backup generator is down. You have 3 post-op patients in the ICU and the senior doctor is not reachable during this nationwide blackout.',
            'optionA': {'text': 'Call every mechanic you know to fix the generator NOW', 'impacts': {'money': -5000, 'stress': -20, 'businessGrowth': 0}},
            'optionB': {'text': 'Manually monitor patients and hope light comes back soon', 'impacts': {'money': 0, 'stress': 40, 'businessGrowth': 0}},
            'optionC': {'text': 'Prepare patients for safe transfer to another hospital', 'impacts': {'money': -2000, 'stress': 5, 'businessGrowth': -2}}
        },
        {
            'text': '🩺 The Bribe: A politician is admitted with "stomach issues" his family paid ₦6M for your private visit. He winks and slides you ₦2M cash. The diagnosis is just indigestion, but he wants IV treatment anyway.',
            'optionA': {'text': 'Keep the money and give him what he wants (just saline IV)', 'impacts': {'money': 20000, 'stress': 15, 'businessGrowth': 0}},
            'optionB': {'text': 'Refuse the money and give proper medical advice', 'impacts': {'money': 0, 'stress': -15, 'businessGrowth': 2}},
            'optionC': {'text': 'Accept minimal fee, refuse bribe, recommend gastroenterologist', 'impacts': {'money': 5000, 'stress': -5, 'businessGrowth': 1}}
        },
        {
            'text': '🚑 Understaffed Ward: Your pediatric ward has only 2 of 5 nurses showing up today. You have 20 sick children and worried parents. One child has suspected meningitis. Do you postpone other patients or overwork your small team?',
            'optionA': {'text': 'Work the small team harder - prioritize the meningitis case', 'impacts': {'money': 0, 'stress': 35, 'businessGrowth': 0}},
            'optionB': {'text': 'Postpone non-urgent cases and call for additional support', 'impacts': {'money': -3000, 'stress': 5, 'businessGrowth': 1}},
            'optionC': {'text': 'Triage cases and request patient families help care for stable children', 'impacts': {'money': -1000, 'stress': 20, 'businessGrowth': 2}}
        },
        {
            'text': '💊 Medication Recall: Your pharmacy just informed you that a batch of ₦8M worth of antibiotics you prescribed last month were contaminated and recalled. You\'ve already given them to 40+ patients. Legal liability looms.',
            'optionA': {'text': 'Immediately notify all patients and prepare for lawsuits', 'impacts': {'money': -20000, 'stress': 45, 'businessGrowth': 2}},
            'optionB': {'text': 'Quietly monitor patient complaints first (risky ethically)', 'impacts': {'money': 0, 'stress': 50, 'businessGrowth': -5}},
            'optionC': {'text': 'Contact hospital legal team and manufacturer for guidance', 'impacts': {'money': -5000, 'stress': 25, 'businessGrowth': 1}}
        },
        {
            'text': '⚠️ The Family Pressure: Your wife is exhausted by your 70-hour work weeks. She\'s threatening to move back to her parents with the kids unless you reduce hours. You\'re finally building your reputation and income.',
            'optionA': {'text': 'Cut your hours and prioritize family', 'impacts': {'money': -12000, 'stress': -25, 'businessGrowth': -3}},
            'optionB': {'text': 'Promise to improve eventually but keep grinding now', 'impacts': {'money': 10000, 'stress': 20, 'businessGrowth': 2}},
            'optionC': {'text': 'Hire administrative staff to reduce burnout while maintaining growth', 'impacts': {'money': -8000, 'stress': -10, 'businessGrowth': 1}}
        },
        {
            'text': '🏆 The Research Opportunity: A prestigious UK hospital offers you a 2-year research fellowship (doubles your income) BUT you\'ll miss your kids\' formative years and your wife\'s medical residency. Only one of you can pursue big dreams.',
            'optionA': {'text': 'Take the fellowship for career advancement', 'impacts': {'money': 50000, 'stress': 30, 'businessGrowth': 8}},
            'optionB': {'text': 'Decline and support your wife\'s residency instead', 'impacts': {'money': 0, 'stress': -20, 'businessGrowth': 0}},
            'optionC': {'text': 'Negotiate a 1-year fellowship with family visits', 'impacts': {'money': 25000, 'stress': 10, 'businessGrowth': 4}}
        },
        {
            'text': '👴 Elderly Parent Care: Your 75-year-old father has advanced diabetes. He needs ₦2M for surgery and ongoing care. You\'re the only child. State hospital options are months of waiting with poor outcomes. Your savings are ₦3M.',
            'optionA': {'text': 'Spend ₦2M on private hospital immediately', 'impacts': {'money': -15000, 'stress': -10, 'businessGrowth': 0}},
            'optionB': {'text': 'Use contacts to get him into state hospital quickly (risky)', 'impacts': {'money': 0, 'stress': 35, 'businessGrowth': 0}},
            'optionC': {'text': 'Apply for medical loans and arrange phased payment plan', 'impacts': {'money': -8000, 'stress': 15, 'businessGrowth': -1}}
        },
        {
            'text': '🔬 Experimental Treatment: A desperate patient begs you to try an experimental treatment that isn\'t approved in Nigeria yet. It could work miracles OR cause permanent disability. No literature to guide you. They\'re willing to sign waivers.',
            'optionA': {'text': 'Attempt the experimental treatment (risky innovation)', 'impacts': {'money': 10000, 'stress': 45, 'businessGrowth': 5}},
            'optionB': {'text': 'Refuse and stick to approved protocols', 'impacts': {'money': 0, 'stress': 15, 'businessGrowth': 0}},
            'optionC': {'text': 'Consult medical board and ethics committee for guidance', 'impacts': {'money': -2000, 'stress': 20, 'businessGrowth': 1}}
        },
        {
            'text': '💰 Private Practice vs Public: You\'ve been offered a partnership in a booming private hospital. It pays ₦5M/month but you\'ll abandon your public hospital patients who depend on you. Walking away feels like betrayal.',
            'optionA': {'text': 'Join the private practice and maximize income', 'impacts': {'money': 250000, 'stress': 25, 'businessGrowth': 10}},
            'optionB': {'text': 'Stay public and serve your community', 'impacts': {'money': 15000, 'stress': -15, 'businessGrowth': 2}},
            'optionC': {'text': 'Join private but maintain weekly public clinic', 'impacts': {'money': 150000, 'stress': 20, 'businessGrowth': 5}}
        },
        {
            'text': '🩹 Medical Malpractice Lawsuit: A patient who had a complication during surgery is suing you for ₦50M. Your insurance covers ₦30M. You must defend against the claim which will take 3 years and ₦5M in legal fees.',
            'optionA': {'text': 'Settle for the full insurance amount', 'impacts': {'money': -30000, 'stress': 20, 'businessGrowth': 0}},
            'optionB': {'text': 'Fight the case in court despite the cost', 'impacts': {'money': -25000, 'stress': 55, 'businessGrowth': -2}},
            'optionC': {'text': 'Offer partial settlement and implement safety improvements', 'impacts': {'money': -15000, 'stress': 25, 'businessGrowth': 1}}
        },
        {
            'text': '💉 Drug Sales Pressure: A pharmaceutical representative offers you ₦500k/month to recommend their expensive brand drugs (which are identical to cheaper generics). "Everyone does it," he says.',
            'optionA': {'text': 'Accept the money - patients can afford both brands', 'impacts': {'money': 25000, 'stress': 30, 'businessGrowth': 0}},
            'optionB': {'text': 'Refuse and prescribe generics always', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': 2}},
            'optionC': {'text': 'Partner with him to educate patients about both options', 'impacts': {'money': 10000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '🏥 Hospital Closure Threat: Your small private hospital faces closure due to new regulations. The government wants to consolidate all hospitals. You can try to fight it (expensive) or sell to a mega-corporation.',
            'optionA': {'text': 'Fight the government decision and go bankrupt', 'impacts': {'money': -100000, 'stress': 60, 'businessGrowth': -5}},
            'optionB': {'text': 'Sell to mega-corporation for ₦100M', 'impacts': {'money': 50000, 'stress': -20, 'businessGrowth': 0}},
            'optionC': {'text': 'Partner with other hospitals to meet new requirements', 'impacts': {'money': -20000, 'stress': 20, 'businessGrowth': 3}}
        },
        {
            'text': '🌡️ Pandemic Patient Surge: COVID cases explode and your hospital is overwhelmed. You need to hire 50 more staff but can\'t find them. Risk patient deaths from inadequate care.',
            'optionA': {'text': 'Hire unqualified staff quickly to fill gaps', 'impacts': {'money': -25000, 'stress': 40, 'businessGrowth': -3}},
            'optionB': {'text': 'Maintain standards and turn away patients', 'impacts': {'money': -40000, 'stress': 45, 'businessGrowth': -2}},
            'optionC': {'text': 'Collaborate with other hospitals to share resources', 'impacts': {'money': -15000, 'stress': 20, 'businessGrowth': 2}}
        },
        {
            'text': '📊 Medical Residency Program Start: A university offers you the role of program director to train 50 new doctors. It\'s prestigious but requires ₦10M salary reduction and 5 years commitment.',
            'optionA': {'text': 'Accept and build your legacy', 'impacts': {'money': -50000, 'stress': -25, 'businessGrowth': 10}},
            'optionB': {'text': 'Decline and focus on private practice', 'impacts': {'money': 30000, 'stress': 5, 'businessGrowth': 2}},
            'optionC': {'text': 'Negotiate part-time director role maintaining private practice', 'impacts': {'money': 10000, 'stress': 10, 'businessGrowth': 5}}
        }
    ],
    'Engineering': [
        {
            'text': '⚙️ The Site Visit: You\'re inspecting a building site in Lekki in heavy rain. The site foreman says "sir/madam, the foundation is solid, those cracks are just cosmetic." You can\'t see clearly but the deadline is TODAY to approve the next phase.',
            'optionA': {'text': 'Inspect thoroughly and delay approval', 'impacts': {'money': -3000, 'stress': -10, 'businessGrowth': 2}},
            'optionB': {'text': 'Approve based on foreman\'s word (time is money)', 'impacts': {'money': 8000, 'stress': 10, 'businessGrowth': -2}},
            'optionC': {'text': 'Request structural engineer\'s report before approval', 'impacts': {'money': -1000, 'stress': 5, 'businessGrowth': 1}}
        },
        {
            'text': '🔌 The Diesel Heist: You arrive at your construction site to find the generators diesel has been stolen AGAIN. ₦600k worth. The contractors need power NOW or they lose ₦2M daily. Your client is calling every 5 minutes.',
            'optionA': {'text': 'Buy more diesel at triple market price from black market dealer', 'impacts': {'money': -10000, 'stress': 0, 'businessGrowth': 0}},
            'optionB': {'text': 'Report to police and suspend work (lose ₦2M daily)', 'impacts': {'money': -15000, 'stress': -20, 'businessGrowth': 0}},
            'optionC': {'text': 'Install security and negotiate client extension', 'impacts': {'money': -5000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '📐 The Blueprint Disaster: Your engineer just discovered the main electrical blueprint has a critical error discovered after 60% of work is done. The client will definitely sue. Fixing it costs ₦40M and delays the project 4 months.',
            'optionA': {'text': 'Confess immediately and present fix plan', 'impacts': {'money': -8000, 'stress': 25, 'businessGrowth': 1}},
            'optionB': {'text': 'Quietly fix it and hope no one notices', 'impacts': {'money': 0, 'stress': 35, 'businessGrowth': -3}},
            'optionC': {'text': 'Bring in external engineer for second opinion first', 'impacts': {'money': -3000, 'stress': 20, 'businessGrowth': 2}}
        },
        {
            'text': '🏗️ Labor Strike: Your construction workers demand ₦50k/month bonus (15% pay increase) or they walk. Your margin is only 8% on this project. You have 200 workers. Walking means losing ₦500M contract.',
            'optionA': {'text': 'Pay the bonus and absorb the loss', 'impacts': {'money': -40000, 'stress': -15, 'businessGrowth': 0}},
            'optionB': {'text': 'Refuse and risk project shutdown', 'impacts': {'money': -25000, 'stress': 45, 'businessGrowth': -2}},
            'optionC': {'text': 'Negotiate phased bonus based on milestones', 'impacts': {'money': -15000, 'stress': 15, 'businessGrowth': 1}}
        },
        {
            'text': '💳 Cement Supply Scam: Your usual supplier disappeared with ₦15M advance for cement. The project needs 500 bags by tomorrow. Black market supplier wants ₦45k/bag (₦5k above market). No alternatives available.',
            'optionA': {'text': 'Pay the black market price to keep project on track', 'impacts': {'money': -22500, 'stress': 5, 'businessGrowth': 0}},
            'optionB': {'text': 'Delay and sue the original supplier (months of court)', 'impacts': {'money': -10000, 'stress': 40, 'businessGrowth': -1}},
            'optionC': {'text': 'Contact cement manufacturers directly for emergency supply', 'impacts': {'money': -12000, 'stress': 20, 'businessGrowth': 1}}
        },
        {
            'text': '🌧️ Weather Disaster: Freak flooding destroys ₦80M of equipment and materials on your site. Insurance claims it was "acts of God" and refuses to pay. Your client is furious and threatening to cancel.',
            'optionA': {'text': 'Negotiate extended timeline and borrow to replace materials', 'impacts': {'money': -35000, 'stress': 30, 'businessGrowth': -2}},
            'optionB': {'text': 'Start legal battle with insurance immediately', 'impacts': {'money': -5000, 'stress': 50, 'businessGrowth': 0}},
            'optionC': {'text': 'Recover what\'s salvageable and accelerate alternate phase', 'impacts': {'money': -20000, 'stress': 25, 'businessGrowth': 2}}
        },
        {
            'text': '👷 Safety Violation Discovered: Your team finds that a subcontractor cut corners on safety during construction. Workers were at risk. FIRS could levy ₦50M+ in fines and shut you down for 6 months if they find out.',
            'optionA': {'text': 'Self-report to authorities and implement fixes (transparent)', 'impacts': {'money': -20000, 'stress': 20, 'businessGrowth': 2}},
            'optionB': {'text': 'Fix it internally and hope it doesn\'t surface', 'impacts': {'money': 0, 'stress': 50, 'businessGrowth': -3}},
            'optionC': {'text': 'Quietly upgrade safety and document improvements', 'impacts': {'money': -8000, 'stress': 40, 'businessGrowth': 0}}
        },
        {
            'text': '💼 Merger Opportunity: A bigger construction firm offers to acquire your company for ₦200M. You\'d become their technical director (stable job, less stress) but lose independence. Your vision of building iconic structures dies.',
            'optionA': {'text': 'Sell and join the mega firm', 'impacts': {'money': 100000, 'stress': -30, 'businessGrowth': 0}},
            'optionB': {'text': 'Decline and keep building your own legacy', 'impacts': {'money': 8000, 'stress': 10, 'businessGrowth': 5}},
            'optionC': {'text': 'Negotiate partnership arrangement instead of full acquisition', 'impacts': {'money': 40000, 'stress': -10, 'businessGrowth': 2}}
        },
        {
            'text': '🏭 Factory Accident Lawsuit: A construction worker lost his arm at your site. His family is suing for ₦100M. Insurance is disputing liability. Settlement might cost ₦30M but litigation could cost ₦80M over 5 years.',
            'optionA': {'text': 'Settle quickly to avoid prolonged litigation', 'impacts': {'money': -150000, 'stress': -20, 'businessGrowth': 0}},
            'optionB': {'text': 'Fight it in court despite the cost and stress', 'impacts': {'money': -40000, 'stress': 55, 'businessGrowth': -2}},
            'optionC': {'text': 'Work with insurance for fair settlement and prosthetics fund', 'impacts': {'money': -80000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '🌈 Legacy Project Offer: A prestigious firm offers you the lead on building Nigeria\'s first ₦1T mega-project. It\'s career-defining but requires 24/7 commitment for 5 years straight. Your personal life will be sacrificed.',
            'optionA': {'text': 'Take the legacy project and cement your legacy', 'impacts': {'money': 150000, 'stress': 50, 'businessGrowth': 15}},
            'optionB': {'text': 'Decline and prioritize balance', 'impacts': {'money': 20000, 'stress': -20, 'businessGrowth': 1}},
            'optionC': {'text': 'Lead project with hired deputy for work-life balance', 'impacts': {'money': 100000, 'stress': 30, 'businessGrowth': 10}}
        },
        {
            'text': '🔧 BIM Technology Upgrade: Industry is shifting to Building Information Modeling (BIM). Adopting costs ₦50M upfront and requires 18 months training, but gives you competitive edge. Ignoring it makes you obsolete in 5 years.',
            'optionA': {'text': 'Invest immediately in BIM transformation', 'impacts': {'money': -250000, 'stress': 30, 'businessGrowth': 8}},
            'optionB': {'text': 'Stay with traditional methods (lose contracts later)', 'impacts': {'money': 10000, 'stress': -10, 'businessGrowth': -2}},
            'optionC': {'text': 'Hire BIM specialists and gradually transition', 'impacts': {'money': -100000, 'stress': 15, 'businessGrowth': 4}}
        },
        {
            'text': '🌍 International Project Bid: An international consortium wants your firm to bid on a ₦500M project in West Africa. Winning needs ₦50M upfront investment and team relocation. Losing wastes the ₦50M.',
            'optionA': {'text': 'Bid aggressively and invest the ₦50M', 'impacts': {'money': -250000, 'stress': 35, 'businessGrowth': 8}},
            'optionB': {'text': 'Skip the bid and focus on local projects', 'impacts': {'money': 0, 'stress': -5, 'businessGrowth': 0}},
            'optionC': {'text': 'Partner with local firm to share risk', 'impacts': {'money': -100000, 'stress': 15, 'businessGrowth': 5}}
        },
        {
            'text': '🌱 Sustainable Building Push: Eco-friendly materials cost 30% more but clients increasingly demand them. Should you pivot your entire business model?',
            'optionA': {'text': 'Go 100% sustainable building practices', 'impacts': {'money': -50000, 'stress': 10, 'businessGrowth': 6}},
            'optionB': {'text': 'Maintain conventional methods and lose eco-conscious clients', 'impacts': {'money': 15000, 'stress': -5, 'businessGrowth': -1}},
            'optionC': {'text': 'Offer both options and let clients choose', 'impacts': {'money': 0, 'stress': 5, 'businessGrowth': 2}}
        },
        {
            'text': '📱 Project Management Software Integration: New software streamlines workflow and saves ₦20M/year but costs ₦8M to implement and staff resist change.',
            'optionA': {'text': 'Force integration with mandatory training', 'impacts': {'money': 100000, 'stress': 25, 'businessGrowth': 4}},
            'optionB': {'text': 'Keep existing systems to avoid disruption', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': -1}},
            'optionC': {'text': 'Pilot with one team and expand gradually', 'impacts': {'money': 50000, 'stress': 10, 'businessGrowth': 2}}
        }
    ],
    'Law': [
        {
            'text': '⚖️ The Rushed Brief: You just got a brief for a magistrate court case hearing TOMORROW morning at 10 AM. It\'s 6 PM. Your opponent already filed 15 pages of counter-arguments. The case fee is only ₦80k but you need to prove yourself.',
            'optionA': {'text': 'Pull an all-nighter and prepare thoroughly', 'impacts': {'money': 10000, 'stress': 30, 'businessGrowth': 2}},
            'optionB': {'text': 'Request postponement (look weak but stay sane)', 'impacts': {'money': -5000, 'stress': -15, 'businessGrowth': -1}},
            'optionC': {'text': 'Partner with experienced lawyer for case support', 'impacts': {'money': 5000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '💰 Payment Issues: You won a ₦5M case 3 months ago. Your client replies to every invoice with "the money is coming" but nothing. You\'ve spent ₦2M in office overhead. Now he\'s ignoring your calls.',
            'optionA': {'text': 'File a lien against his assets immediately', 'impacts': {'money': 3000, 'stress': 15, 'businessGrowth': 1}},
            'optionB': {'text': 'Write it off as a loss and move on (preserve relationship)', 'impacts': {'money': -2000, 'stress': -20, 'businessGrowth': 0}},
            'optionC': {'text': 'Send formal demand letter with legal consequences', 'impacts': {'money': 1000, 'stress': 10, 'businessGrowth': 0}}
        },
        {
            'text': '📜 The Conflict: Your biggest retainer client (₦1M/month) comes to you with a case. Midway, you realize they\'re opposing you in another case. Bar ethics say you CANNOT represent both. Your managing partner says "find a loophole."',
            'optionA': {'text': 'Drop one client and refer them elsewhere (lose ₦1M/month)', 'impacts': {'money': -20000, 'stress': -10, 'businessGrowth': 2}},
            'optionB': {'text': 'Seek ethics board guidance NOW (proper but risky)', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 1}},
            'optionC': {'text': 'Create information barriers within your firm', 'impacts': {'money': -5000, 'stress': 15, 'businessGrowth': 0}}
        },
        {
            'text': '🔨 Judge Corruption Witness: You\'re in court and realize the judge is clearly biased toward your opponent (who is his cousin). You have evidence of his corruption but reporting it will make enemies. Your client\'s ₦50M inheritance claim is at stake.',
            'optionA': {'text': 'Report the judge to the Bar Association', 'impacts': {'money': -8000, 'stress': 35, 'businessGrowth': 2}},
            'optionB': {'text': 'Request a procedural adjournment and file privately later', 'impacts': {'money': 0, 'stress': 20, 'businessGrowth': 0}},
            'optionC': {'text': 'Challenge judge recusal based on bias', 'impacts': {'money': -2000, 'stress': 25, 'businessGrowth': 1}}
        },
        {
            'text': '📋 Document Fraud Discovery: Your paralegal discovers your opposing counsel submitted forged property deeds. This is a slam-dunk win for your client BUT exposing it means your opponent (senior lawyer) goes to jail. His wife comes to you begging for mercy.',
            'optionA': {'text': 'Report it to court - the law is the law', 'impacts': {'money': 25000, 'stress': 25, 'businessGrowth': 3}},
            'optionB': {'text': 'Settle quietly and move on without exposing him', 'impacts': {'money': 10000, 'stress': 40, 'businessGrowth': -2}},
            'optionC': {'text': 'Give him opportunity to withdraw case voluntarily', 'impacts': {'money': 15000, 'stress': 15, 'businessGrowth': 1}}
        },
        {
            'text': '👨‍⚖️ The Impossible Client: Your client is clearly guilty of assault but demands you defend him aggressively in court (he has money to pay). Your conscience is screaming but you\'re ₦300k in debt and have kids to feed.',
            'optionA': {'text': 'Provide vigorous legal defense (professional obligation)', 'impacts': {'money': 15000, 'stress': 25, 'businessGrowth': 0}},
            'optionB': {'text': 'Withdraw from case and recommend the Bar assign him a public defender', 'impacts': {'money': -8000, 'stress': -15, 'businessGrowth': 1}},
            'optionC': {'text': 'Negotiate guilty plea and reduced sentence', 'impacts': {'money': 8000, 'stress': 5, 'businessGrowth': 1}}
        },
        {
            'text': '⏰ Partnership Dissolved: Your law firm partner of 10 years is retiring and selling his share to a rival lawyer you\'ve been competing against. The new partner wants to dissolve your current agreements and restructure (reducing your authority by 40%).',
            'optionA': {'text': 'Accept the restructure and adapt', 'impacts': {'money': -12000, 'stress': 20, 'businessGrowth': 0}},
            'optionB': {'text': 'Buy out the retiring partner\'s share yourself (takes all savings)', 'impacts': {'money': -80000, 'stress': -25, 'businessGrowth': 0}},
            'optionC': {'text': 'Start your own firm to keep your clients', 'impacts': {'money': -50000, 'stress': 15, 'businessGrowth': 5}}
        },
        {
            'text': '🎓 Protégé Crisis: Your junior lawyer (who you\'ve trained for 3 years) gets a ₦2B offer from a multinational. He\'s the backbone of your practice. You can\'t match the salary but you\'ve invested everything in him.',
            'optionA': {'text': 'Let him go with your blessing (lose expertise)', 'impacts': {'money': -15000, 'stress': 10, 'businessGrowth': 0}},
            'optionB': {'text': 'Counter-offer and go into debt to match it', 'impacts': {'money': -35000, 'stress': -20, 'businessGrowth': 2}},
            'optionC': {'text': 'Wish him well and hire replacement junior lawyer', 'impacts': {'money': -20000, 'stress': 5, 'businessGrowth': 1}}
        },
        {
            'text': '⚡ Precedent-Breaking Case: You can argue a groundbreaking case that could change Nigerian law forever. It\'ll establish your legacy BUT requires 3 years of pro-bono work and ₦50M in expenses.',
            'optionA': {'text': 'Take the historic case for legacy', 'impacts': {'money': -250000, 'stress': -30, 'businessGrowth': 12}},
            'optionB': {'text': 'Decline and focus on profitable cases', 'impacts': {'money': 30000, 'stress': 10, 'businessGrowth': 0}},
            'optionC': {'text': 'Negotiate pro-bono with university law faculty support', 'impacts': {'money': -100000, 'stress': -10, 'businessGrowth': 8}}
        },
        {
            'text': '🌍 International Practice: A London law firm wants to make you a partner in their Lagos office. Global exposure, ₦10M/year, but you become distant from your roots and lose Nigerian clientele.',
            'optionA': {'text': 'Go international and expand horizons', 'impacts': {'money': 80000, 'stress': -20, 'businessGrowth': 6}},
            'optionB': {'text': 'Stay rooted in Lagos practice', 'impacts': {'money': 12000, 'stress': 5, 'businessGrowth': 1}},
            'optionC': {'text': 'Maintain Lagos base with international consulting work', 'impacts': {'money': 40000, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '📰 Media Case Against Government: A whistleblower brings you evidence of massive government corruption. The case will be high-profile but extremely dangerous. Your family begs you not to take it.',
            'optionA': {'text': 'Take the case and fight for justice', 'impacts': {'money': -20000, 'stress': 60, 'businessGrowth': 8}},
            'optionB': {'text': 'Refer to international rights organization', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 1}},
            'optionC': {'text': 'Take case but insist on police protection', 'impacts': {'money': -5000, 'stress': 40, 'businessGrowth': 5}}
        },
        {
            'text': '🏦 Banking Sector Collapse: Your main corporate client (₦50M annual retainer) is a bank facing collapse and regulatory investigation. Everyone is abandoning them but they pay well. Do you follow them down?',
            'optionA': {'text': 'Defend them aggressively through crisis', 'impacts': {'money': 80000, 'stress': 50, 'businessGrowth': -4}},
            'optionB': {'text': 'Withdraw and preserve your reputation', 'impacts': {'money': -50000, 'stress': -20, 'businessGrowth': 1}},
            'optionC': {'text': 'Represent them for regulatory compliance only', 'impacts': {'money': 20000, 'stress': 25, 'businessGrowth': 0}}
        },
        {
            'text': '💡 Legal Tech Startup: You\'re offered partnership in a AI-powered legal tech startup. It could disrupt the industry and make you rich, but requires you to leave traditional practice for 5 years.',
            'optionA': {'text': 'Join startup and bet on future', 'impacts': {'money': 100000, 'stress': 40, 'businessGrowth': 10}},
            'optionB': {'text': 'Maintain comfortable traditional practice', 'impacts': {'money': 30000, 'stress': 0, 'businessGrowth': 1}},
            'optionC': {'text': 'Invest capital but maintain law practice part-time', 'impacts': {'money': 20000, 'stress': 25, 'businessGrowth': 5}}
        },
        {
            'text': '⚖️ Wrongful Conviction Appeal: A man spent 15 years in prison for a crime he didn\'t commit. New evidence emerges. The case will cost ₦10M to pursue but is guaranteed win. Society will thank you but financially ruined.',
            'optionA': {'text': 'Take the case pro-bono and free him', 'impacts': {'money': -50000, 'stress': -50, 'businessGrowth': 8}},
            'optionB': {'text': 'Refer to human rights organization', 'impacts': {'money': 0, 'stress': 5, 'businessGrowth': 1}},
            'optionC': {'text': 'Lead case with pro-bono colleague support', 'impacts': {'money': -20000, 'stress': -20, 'businessGrowth': 6}}
        }
    ],
    'Business': [
        {
            'text': '📊 Audit Alert: Tax authorities just called - they\'re auditing your books from 3 years ago. Your accountant found "questionable" expense entries. They\'re asking for ₦3M in back taxes plus penalties. Your business is making ₦10M monthly.',
            'optionA': {'text': 'Pay immediately to make it go away', 'impacts': {'money': -3000, 'stress': -20, 'businessGrowth': 0}},
            'optionB': {'text': 'Dispute it and hire an accountant to defend you', 'impacts': {'money': -2000, 'stress': 25, 'businessGrowth': 1}},
            'optionC': {'text': 'Negotiate settlement and implement compliance system', 'impacts': {'money': -1500, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '📦 Inventory Crisis: Your warehouse reports ₦6M of inventory is MISSING. Suspected inside theft. Your biggest client is expecting delivery THIS WEEK. You can buy replacement stock at 2x cost (₦12M) or admit the shortage.',
            'optionA': {'text': 'Buy replacements from black market suppliers urgently', 'impacts': {'money': -12000, 'stress': 10, 'businessGrowth': 0}},
            'optionB': {'text': 'Admit to client and investigate properly', 'impacts': {'money': -3000, 'stress': 20, 'businessGrowth': 0}},
            'optionC': {'text': 'Negotiate partial delivery with client timeline extension', 'impacts': {'money': -5000, 'stress': 15, 'businessGrowth': 1}}
        },
        {
            'text': '💳 Cash Flow Emergency: Three major clients owe you ₦12M total. Suppliers want payment in 5 days or they stop supplying. You can take a high-interest emergency loan (15% monthly) or negotiate delays.',
            'optionA': {'text': 'Take the loan to stay current with suppliers', 'impacts': {'money': -2000, 'stress': 5, 'businessGrowth': 0}},
            'optionB': {'text': 'Negotiate with suppliers and aggressively chase clients', 'impacts': {'money': 0, 'stress': 20, 'businessGrowth': 1}},
            'optionC': {'text': 'Offer clients early payment discounts to accelerate cash', 'impacts': {'money': -1000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '🤝 Partnership Betrayal: Your business partner of 5 years just told you he\'s starting a competing company and taking ₦10M of shared clients. You have a non-compete clause but it\'s weak. Litigation will cost ₦5M and take 2 years.',
            'optionA': {'text': 'Sue him immediately despite the cost', 'impacts': {'money': -25000, 'stress': 40, 'businessGrowth': 2}},
            'optionB': {'text': 'Negotiate a settlement and business split', 'impacts': {'money': -8000, 'stress': 15, 'businessGrowth': 1}},
            'optionC': {'text': 'Buy out his share to maintain control', 'impacts': {'money': -60000, 'stress': -10, 'businessGrowth': 2}}
        },
        {
            'text': '💡 Innovation Gamble: You have a chance to invest ₦50M in a new product line that could 3x your revenue in 2 years OR quadruple your losses if it fails. You have ₦60M in savings. Current business is stable but stagnating.',
            'optionA': {'text': 'Go all-in on the new product', 'impacts': {'money': 50000, 'stress': 45, 'businessGrowth': 10}},
            'optionB': {'text': 'Invest half and keep the business risk-managed', 'impacts': {'money': 15000, 'stress': 10, 'businessGrowth': 4}},
            'optionC': {'text': 'Test market with ₦10M pilot program first', 'impacts': {'money': 5000, 'stress': 15, 'businessGrowth': 2}}
        },
        {
            'text': '📱 Market Disruption: A big tech company just launched a service that kills 30% of your revenue overnight. You can pivot to a different market (uncertain) or double down on your current niche (slow decline).',
            'optionA': {'text': 'Pivot aggressively to new market', 'impacts': {'money': -10000, 'stress': 35, 'businessGrowth': 4}},
            'optionB': {'text': 'Consolidate and sell company before it declines further', 'impacts': {'money': 35000, 'stress': -20, 'businessGrowth': 0}},
            'optionC': {'text': 'Partner with tech company to integrate their service', 'impacts': {'money': 5000, 'stress': 20, 'businessGrowth': 3}}
        },
        {
            'text': '👥 Employee Mutiny: Your 15-person team is threatening to quit en masse if you don\'t give them equity stakes. You\'re not ready to dilute ownership. They\'re your most talented staff and impossible to replace.',
            'optionA': {'text': 'Give them equity and restructure ownership', 'impacts': {'money': -20000, 'stress': -15, 'businessGrowth': 3}},
            'optionB': {'text': 'Refuse and start rebuilding your team', 'impacts': {'money': 0, 'stress': 50, 'businessGrowth': -2}},
            'optionC': {'text': 'Offer profit-sharing without equity dilution', 'impacts': {'money': -5000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '🌐 International Expansion: A European distributor offers to buy your entire annual production at a 25% premium, BUT requires you to establish an office there (₦100M investment). You can operate it remotely but it\'s risky.',
            'optionA': {'text': 'Go international and establish the European office', 'impacts': {'money': 80000, 'stress': 30, 'businessGrowth': 8}},
            'optionB': {'text': 'Stay focused on Nigeria and grow gradually', 'impacts': {'money': 10000, 'stress': 5, 'businessGrowth': 1}},
            'optionC': {'text': 'Start with agent/representative model before office', 'impacts': {'money': 20000, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '🤖 Automation vs Jobs: Your IT consultant recommends automating 60% of your operations (save ₦30M/year but lay off 40 employees). These are people who\'ve been with you for 10+ years.',
            'optionA': {'text': 'Automate and maximize profits', 'impacts': {'money': 150000, 'stress': 40, 'businessGrowth': 2}},
            'optionB': {'text': 'Keep people employed and take lower profits', 'impacts': {'money': 25000, 'stress': -20, 'businessGrowth': 1}},
            'optionC': {'text': 'Automate gradually with retraining program for employees', 'impacts': {'money': 80000, 'stress': 10, 'businessGrowth': 3}}
        },
        {
            'text': '💎 Luxury Market Pivot: Your consultant says you can 5x profits by shifting from mass market to ultra-luxury (₦10M products). It requires completely rebuilding your brand and alienating your current customer base.',
            'optionA': {'text': 'Pivot to luxury and chase ₦500M revenue', 'impacts': {'money': 200000, 'stress': 35, 'businessGrowth': 8}},
            'optionB': {'text': 'Stay mass-market and maintain loyal customers', 'impacts': {'money': 30000, 'stress': 5, 'businessGrowth': 1}},
            'optionC': {'text': 'Create two brands: mass market and luxury lines', 'impacts': {'money': 100000, 'stress': 30, 'businessGrowth': 5}}
        },
        {
            'text': '📈 Stock Market Pressure: Private equity investors want to buy your company for ₦500M with clause forcing you to stay 5 more years as CEO. You\'re tired but that\'s generational wealth.',
            'optionA': {'text': 'Accept and commit to 5 more years', 'impacts': {'money': 250000, 'stress': 30, 'businessGrowth': 2}},
            'optionB': {'text': 'Reject and maintain independence', 'impacts': {'money': 30000, 'stress': -10, 'businessGrowth': 3}},
            'optionC': {'text': 'Negotiate 3-year transition with exit clause', 'impacts': {'money': 150000, 'stress': 15, 'businessGrowth': 2}}
        },
        {
            'text': '🌱 ESG Mandate: Your major corporate clients demand you implement Environmental, Social, Governance practices. It costs ₦30M but opens ₦200M in new business from ESG-focused companies.',
            'optionA': {'text': 'Invest fully in ESG transformation', 'impacts': {'money': 100000, 'stress': 20, 'businessGrowth': 8}},
            'optionB': {'text': 'Ignore ESG and maintain status quo', 'impacts': {'money': 0, 'stress': 0, 'businessGrowth': -3}},
            'optionC': {'text': 'Partner with ESG certifier to share implementation cost', 'impacts': {'money': 50000, 'stress': 10, 'businessGrowth': 5}}
        },
        {
            'text': '💰 Bankruptcy Before Success: Your business is at the brink of bankruptcy but you\'re 6 months from product launch that could save everything. Banks won\'t lend anymore. Last resort: personal guarantee loan.',
            'optionA': {'text': 'Take personal guarantee loan and bet everything', 'impacts': {'money': 100000, 'stress': 60, 'businessGrowth': 10}},
            'optionB': {'text': 'Shut down and cut losses', 'impacts': {'money': -200000, 'stress': 30, 'businessGrowth': -5}},
            'optionC': {'text': 'Seek angel investors for final funding round', 'impacts': {'money': 50000, 'stress': 40, 'businessGrowth': 7}}
        },
        {
            'text': '🎯 Exit Strategy Dilemma: Chinese conglomerate offers ₦2B for your company at premium valuation. This is your shot at generational wealth. But your mission was to build a Nigerian empire.',
            'optionA': {'text': 'Sell to China for generational wealth', 'impacts': {'money': 1000000, 'stress': -30, 'businessGrowth': 0}},
            'optionB': {'text': 'Reject and continue building Nigerian company', 'impacts': {'money': 50000, 'stress': 10, 'businessGrowth': 6}},
            'optionC': {'text': 'Negotiate joint venture maintaining control', 'impacts': {'money': 300000, 'stress': 5, 'businessGrowth': 4}}
        }
    ],
    'Computer Science': [
        {
            'text': '💻 The Freelance Nightmare: A client paid you ₦150k upfront to build a "simple website." Two days in, they send a 40-page spec that\'s basically Facebook. They want it in 2 weeks. They\'re already asking for progress "screenshots."',
            'optionA': {'text': 'Deliver a bare MVP and collect the money', 'impacts': {'money': 15000, 'stress': 25, 'businessGrowth': 1}},
            'optionB': {'text': 'Educate them on realistic scope and timeline', 'impacts': {'money': 0, 'stress': 5, 'businessGrowth': 1}},
            'optionC': {'text': 'Propose phased development with adjusted scope', 'impacts': {'money': 5000, 'stress': 10, 'businessGrowth': 2}}
        },
        {
            'text': '☁️ MASSIVE OUTAGE: Your production servers are DOWN. All AWS instances crashed. Your clients are losing ₦500k per hour. The support team is panicking. You don\'t know if it\'s AWS, your code, or a DDoS attack.',
            'optionA': {'text': 'Spin up new instances in different regions immediately', 'impacts': {'money': -8000, 'stress': -15, 'businessGrowth': 2}},
            'optionB': {'text': 'Debug properly first to understand the root cause', 'impacts': {'money': -15000, 'stress': 30, 'businessGrowth': 1}},
            'optionC': {'text': 'Implement failover and debug simultaneously', 'impacts': {'money': -10000, 'stress': 10, 'businessGrowth': 2}}
        },
        {
            'text': '🔐 Security Breach: Your security team detected hackers accessed customer data 3 weeks ago (1,000 users). You just realized. You need to notify users but CEO says "wait, let\'s assess damage first" (cover up)',
            'optionA': {'text': 'Notify affected users immediately and patch the vulnerability', 'impacts': {'money': -5000, 'stress': 15, 'businessGrowth': 2}},
            'optionB': {'text': 'Quietly patch it and monitor for future incidents', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': -3}},
            'optionC': {'text': 'Patch first, then notify within 24 hours', 'impacts': {'money': -2000, 'stress': 20, 'businessGrowth': 1}}
        },
        {
            'text': '🤖 AI Hype Trap: Your company can build AI features everyone is demanding but you don\'t have the expertise. Hiring AI engineers (₦8M/quarter) means gutting your current team budget. Your competitors are moving fast.',
            'optionA': {'text': 'Hire AI experts and pivot the company', 'impacts': {'money': -40000, 'stress': 25, 'businessGrowth': 6}},
            'optionB': {'text': 'Stay focused on your core product strength', 'impacts': {'money': 0, 'stress': 20, 'businessGrowth': 1}},
            'optionC': {'text': 'Partner with AI lab for consulting rather than hiring', 'impacts': {'money': -15000, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '👨‍💻 Toxic Developer Crisis: Your top developer is brilliant but sexually harasses junior staff. Firing him loses ₦12M/year in productivity. Keeping him means losing your entire junior team who are threatening to quit.',
            'optionA': {'text': 'Fire him and uphold company values', 'impacts': {'money': -12000, 'stress': -20, 'businessGrowth': 3}},
            'optionB': {'text': 'Keep him quiet and implement "sensitivity training"', 'impacts': {'money': 0, 'stress': 45, 'businessGrowth': -3}},
            'optionC': {'text': 'Put him on performance improvement plan with clear consequences', 'impacts': {'money': -3000, 'stress': 25, 'businessGrowth': 1}}
        },
        {
            'text': '📊 Acquisition Offer: Google wants to acquire your startup for ₦500M. You\'d become a small team inside a massive company. Your independence and vision die, but you\'re financially set for life at 28.',
            'optionA': {'text': 'Take the ₦500M and join Google', 'impacts': {'money': 250000, 'stress': -30, 'businessGrowth': 0}},
            'optionB': {'text': 'Decline and build your own empire', 'impacts': {'money': 10000, 'stress': 20, 'businessGrowth': 8}},
            'optionC': {'text': 'Counter-offer for strategic partnership instead', 'impacts': {'money': 50000, 'stress': 10, 'businessGrowth': 4}}
        },
        {
            'text': '💾 Technical Debt Rebellion: Your codebase is a mess of shortcuts from rapid growth. Refactoring takes 4 months (no new features). Your product team is demanding new features NOW or you lose market share to faster competitors.',
            'optionA': {'text': 'Stop and refactor properly (lose market momentum)', 'impacts': {'money': -10000, 'stress': -15, 'businessGrowth': 2}},
            'optionB': {'text': 'Keep building on broken foundations (short-term pain later)', 'impacts': {'money': 15000, 'stress': 35, 'businessGrowth': 1}},
            'optionC': {'text': 'Parallel track: refactor 50% while shipping features', 'impacts': {'money': 0, 'stress': 30, 'businessGrowth': 3}}
        },
        {
            'text': '🌍 Open Source Opportunity: A project you created became popular (100k daily users). Companies want to commercialize it. You can open-source it for impact or commercialize for ₦50M+ revenue but lose community trust.',
            'optionA': {'text': 'Open source and maintain the community legacy', 'impacts': {'money': 0, 'stress': -20, 'businessGrowth': 4}},
            'optionB': {'text': 'Commercialize and build a sustainable business', 'impacts': {'money': 60000, 'stress': 15, 'businessGrowth': 2}},
            'optionC': {'text': 'Open source with commercial enterprise support tier', 'impacts': {'money': 30000, 'stress': -5, 'businessGrowth': 4}}
        },
        {
            'text': '🔮 Startup Funding Crunch: Your startup is running out of money. VCs want 51% of your company for ₦500M funding. You\'ll become rich but lose control of your creation.',
            'optionA': {'text': 'Take the VC money and lose control', 'impacts': {'money': 250000, 'stress': 30, 'businessGrowth': 3}},
            'optionB': {'text': 'Bootstrap and stay independent (slow growth)', 'impacts': {'money': -20000, 'stress': 40, 'businessGrowth': 2}},
            'optionC': {'text': 'Negotiate board seat and operational control in VC deal', 'impacts': {'money': 150000, 'stress': 20, 'businessGrowth': 5}}
        },
        {
            'text': '🎯 Product Pivot or Die: Your current product is mature and declining. You must either pivot to a new market (risky) or double down on a dying product (safe but doomed). Market gives you 6 months to decide.',
            'optionA': {'text': 'Aggressively pivot to new product line', 'impacts': {'money': -30000, 'stress': -25, 'businessGrowth': 7}},
            'optionB': {'text': 'Maximize current product profitability until end', 'impacts': {'money': 50000, 'stress': 35, 'businessGrowth': -2}},
            'optionC': {'text': 'Dual track: pivot R&D while scaling current product', 'impacts': {'money': 10000, 'stress': 40, 'businessGrowth': 4}}
        },
        {
            'text': '🔗 Blockchain Craze: Clients are demanding blockchain integration for everything. You don\'t fully understand it. Pretending expertise destroys reputation when it fails. Admitting ignorance loses contracts.',
            'optionA': {'text': 'Learn blockchain and honestly implement where appropriate', 'impacts': {'money': -20000, 'stress': 25, 'businessGrowth': 4}},
            'optionB': {'text': 'Pretend expertise and build shaky blockchain projects', 'impacts': {'money': 40000, 'stress': 50, 'businessGrowth': -5}},
            'optionC': {'text': 'Partner with blockchain specialist to co-deliver', 'impacts': {'money': 10000, 'stress': 10, 'businessGrowth': 2}}
        },
        {
            'text': '📲 Mobile App Saturation: The mobile app market is saturated. Your app is losing users to competitors. You need ₦50M to rebrand and relaunch. Is it worth the gamble?',
            'optionA': {'text': 'Invest ₦50M in major rebrand and relaunch', 'impacts': {'money': -250000, 'stress': 40, 'businessGrowth': 5}},
            'optionB': {'text': 'Shut down app and focus on web platform', 'impacts': {'money': -100000, 'stress': 20, 'businessGrowth': 0}},
            'optionC': {'text': 'Aquire and merge with similar app instead', 'impacts': {'money': -80000, 'stress': 25, 'businessGrowth': 4}}
        },
        {
            'text': '🔴 Data Privacy Violation: Your company accidentally stored customer SSNs in plain text (unencrypted) for 2 years. 500k users affected. FIRS will fine you ₦100M+ and destroy trust. The bug was easy to prevent.',
            'optionA': {'text': 'Self-report and compensate customers', 'impacts': {'money': -500000, 'stress': -20, 'businessGrowth': 2}},
            'optionB': {'text': 'Hide it and hope no one finds out', 'impacts': {'money': 0, 'stress': 60, 'businessGrowth': -5}},
            'optionC': {'text': 'Report to authorities, fix, and offer credit monitoring', 'impacts': {'money': -200000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '🤝 Startup Cofounding Dispute: Your cofounder is incompetent and destroying the company (wrong technical decisions). You own 50/50. Investors want him gone but buying him out costs ₦100M. Not buying him out means stagnation.',
            'optionA': {'text': 'Buy him out and regain control', 'impacts': {'money': -500000, 'stress': -30, 'businessGrowth': 6}},
            'optionB': {'text': 'Force him out legally (expensive litigation)', 'impacts': {'money': -100000, 'stress': 55, 'businessGrowth': 3}},
            'optionC': {'text': 'Bring in COO to manage cofounder', 'impacts': {'money': -40000, 'stress': 30, 'businessGrowth': 2}}
        }
    ],
    'Mass Communication': [
        {
            'text': '📺 The Pressure: You\'re a junior reporter. Your editor says "we need a story by 5 PM for the evening broadcast or you\'re not serious about journalism." You have a lead but no confirmation yet. The lead is juicy.',
            'optionA': {'text': 'Publish with "sources say" caveat', 'impacts': {'money': 5000, 'stress': 10, 'businessGrowth': 1}},
            'optionB': {'text': 'Verify it properly and miss the deadline', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': 2}},
            'optionC': {'text': 'Verify key facts and publish with limited reporting', 'impacts': {'money': 3000, 'stress': 5, 'businessGrowth': 1}}
        },
        {
            'text': '🎤 Live Interview Crisis: You\'re conducting a live interview with a controversial politician on TV (300k viewers). Midway through, your main microphone dies. Complete silence on air. You have 5 seconds to react.',
            'optionA': {'text': 'Hand him a backup mic and keep the energy up', 'impacts': {'money': 8000, 'stress': 10, 'businessGrowth': 2}},
            'optionB': {'text': 'Go to commercial break (looks very bad)', 'impacts': {'money': -2000, 'stress': 20, 'businessGrowth': 0}},
            'optionC': {'text': 'Use phone call interview format to continue', 'impacts': {'money': 4000, 'stress': 15, 'businessGrowth': 1}}
        },
        {
            'text': '📰 Integrity Test: A major advertiser (₦5M/month) demands you kill a negative story about them. The story is 100% verified and newsworthy. Kill it = you keep the ad. Publish it = you lose the biggest paycheck ever.',
            'optionA': {'text': 'Kill the story to keep revenue', 'impacts': {'money': 5000, 'stress': -5, 'businessGrowth': -3}},
            'optionB': {'text': 'Publish and lose the advertiser', 'impacts': {'money': -5000, 'stress': -15, 'businessGrowth': 4}},
            'optionC': {'text': 'Publish but offer advertiser response/rebuttal space', 'impacts': {'money': 2000, 'stress': -10, 'businessGrowth': 2}}
        },
        {
            'text': '🎬 Social Media Firestorm: Your station published a video piece that went viral with 5M views BUT contains one subtle factual error. Social media is attacking you mercilessly. Issue a retraction or ignore it?',
            'optionA': {'text': 'Issue a clear retraction and apologize (admits error)', 'impacts': {'money': -3000, 'stress': 10, 'businessGrowth': 2}},
            'optionB': {'text': 'Stay silent and let the story die (risky for credibility)', 'impacts': {'money': 10000, 'stress': 30, 'businessGrowth': -2}},
            'optionC': {'text': 'Post follow-up story explaining the context and error', 'impacts': {'money': 0, 'stress': 15, 'businessGrowth': 1}}
        },
        {
            'text': '🎞️ Exclusive Offer: A whistleblower has evidence of government corruption (massive exposé). But publishing it means he\'s in physical danger. He asks you to delay 2 weeks so he can leave the country safely.',
            'optionA': {'text': 'Publish immediately for ratings and impact', 'impacts': {'money': 20000, 'stress': 45, 'businessGrowth': 5}},
            'optionB': {'text': 'Wait 2 weeks to protect him (lose exclusivity window)', 'impacts': {'money': 5000, 'stress': -20, 'businessGrowth': 4}},
            'optionC': {'text': 'Publish with anonymity and delayed timeline compromise', 'impacts': {'money': 10000, 'stress': 10, 'businessGrowth': 3}}
        },
        {
            'text': '📡 New Media vs Legacy: Your news agency is bleeding money. Digital content generates ₦2M/month but TV/radio generates ₦15M. You can invest ₦50M to modernize digital OR maintain legacy operations that are slowly dying.',
            'optionA': {'text': 'Go all-in on digital transformation', 'impacts': {'money': -25000, 'stress': 30, 'businessGrowth': 6}},
            'optionB': {'text': 'Maintain current operations and decline slowly', 'impacts': {'money': 8000, 'stress': 25, 'businessGrowth': -2}},
            'optionC': {'text': 'Gradual shift with legacy and digital integration', 'impacts': {'money': -10000, 'stress': 20, 'businessGrowth': 3}}
        },
        {
            'text': '👥 Hostile Takeover Bid: A foreign media conglomerate offers to buy your agency for ₦300M. They want to control editorial direction to favor their business interests. You\'d lose editorial independence but the money sets you up for life.',
            'optionA': {'text': 'Sell and retire wealthy', 'impacts': {'money': 150000, 'stress': -30, 'businessGrowth': -5}},
            'optionB': {'text': 'Reject and maintain editorial independence', 'impacts': {'money': 5000, 'stress': 15, 'businessGrowth': 3}},
            'optionC': {'text': 'Negotiate editorial board veto in ownership deal', 'impacts': {'money': 100000, 'stress': -10, 'businessGrowth': 0}}
        },
        {
            'text': '🚁 War Zone Assignment: Your outlet wants you to cover an active conflict zone (₦500k hazard bonus). It\'s career-defining but physically dangerous. You have a 3-year-old daughter and unstable wife.',
            'optionA': {'text': 'Go to the conflict zone and report the truth', 'impacts': {'money': 25000, 'stress': 45, 'businessGrowth': 6}},
            'optionB': {'text': 'Decline and stay home (miss career peak)', 'impacts': {'money': 0, 'stress': -20, 'businessGrowth': 1}},
            'optionC': {'text': 'Go but with professional security team (higher cost)', 'impacts': {'money': 15000, 'stress': 25, 'businessGrowth': 5}}
        },
        {
            'text': '📡 Deepfake Accusation: Someone creates a deepfake video of you accepting a bribe. It goes viral. You\'re innocent but your credibility is destroyed. Media outlets are asking for comments.',
            'optionA': {'text': 'Sue them and fight back aggressively', 'impacts': {'money': -20000, 'stress': 40, 'businessGrowth': 1}},
            'optionB': {'text': 'Lay low and let the story die (look guilty)', 'impacts': {'money': 0, 'stress': 50, 'businessGrowth': -3}},
            'optionC': {'text': 'Immediately address with video proof of innocence', 'impacts': {'money': -5000, 'stress': 20, 'businessGrowth': 3}}
        },
        {
            'text': '🏆 International Award vs Local Impact: You\'re nominated for a prestigious international award. Accepting requires traveling year-round and becoming international correspondent. You lose touch with Nigeria stories you care about.',
            'optionA': {'text': 'Accept the award and go international', 'impacts': {'money': 40000, 'stress': -25, 'businessGrowth': 5}},
            'optionB': {'text': 'Decline and stay grassroots in Nigeria', 'impacts': {'money': 5000, 'stress': 10, 'businessGrowth': 2}},
            'optionC': {'text': 'Accept award with quarterly Nigeria reporting requirement', 'impacts': {'money': 20000, 'stress': 0, 'businessGrowth': 3}}
        },
        {
            'text': '💰 Influencer Sponsorship Pressure: Brands are offering ₦1M+/month to blend advertising into your editorial. It\'s presented as "native advertising." Done subtly, audiences won\'t notice the conflicts.',
            'optionA': {'text': 'Accept sponsorships and clearly disclose them', 'impacts': {'money': 50000, 'stress': 10, 'businessGrowth': 0}},
            'optionB': {'text': 'Refuse all sponsorships and stay independent', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': 2}},
            'optionC': {'text': 'Accept only sponsorships of products you genuinely use', 'impacts': {'money': 20000, 'stress': 5, 'businessGrowth': 1}}
        },
        {
            'text': '📻 Radio Station Consolidation: Bigger company wants to acquire your independent radio station. You\'d lose creative control but your staff gets job security. Solo ownership means financial struggle.',
            'optionA': {'text': 'Sell and let staff keep jobs', 'impacts': {'money': 80000, 'stress': -20, 'businessGrowth': -2}},
            'optionB': {'text': 'Stay independent and risk staff layoffs', 'impacts': {'money': 10000, 'stress': 35, 'businessGrowth': 2}},
            'optionC': {'text': 'Form cooperative with competing independent stations', 'impacts': {'money': 5000, 'stress': 20, 'businessGrowth': 3}}
        },
        {
            'text': '🎙️ Political Interview Ethics: A presidential candidate offers exclusive pre-election interview ONLY if you agree to softball questions. Without the interview, your competitor gets the scoop.',
            'optionA': {'text': 'Take the interview and ask hard questions anyway', 'impacts': {'money': 15000, 'stress': 15, 'businessGrowth': 3}},
            'optionB': {'text': 'Decline and maintain editorial integrity', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': 2}},
            'optionC': {'text': 'Take the interview and ask agreed-upon questions', 'impacts': {'money': 15000, 'stress': 35, 'businessGrowth': -2}}
        },
        {
            'text': '📺 Streaming vs Cable: Audience is migrating to streaming platforms. Your cable channel is losing advertisers. Pivoting costs ₦100M and 2 years to establish. Staying puts you obsolete in 5 years.',
            'optionA': {'text': 'Pivot aggressively to streaming', 'impacts': {'money': -500000, 'stress': 40, 'businessGrowth': 6}},
            'optionB': {'text': 'Maintain cable focus and decline gracefully', 'impacts': {'money': 30000, 'stress': 20, 'businessGrowth': -3}},
            'optionC': {'text': 'Dual content strategy: cable and streaming simultaneously', 'impacts': {'money': -200000, 'stress': 35, 'businessGrowth': 3}}
        },
        {
            'text': '🌐 International News Bureau: International news agency wants you to open Lagos bureau, hiring 20 locals. It brings diversity and resources but foreign editorial control. Pure journalism vs pragmatic survival.',
            'optionA': {'text': 'Partner with international agency for resources', 'impacts': {'money': 60000, 'stress': 10, 'businessGrowth': 4}},
            'optionB': {'text': 'Maintain independence and struggle financially', 'impacts': {'money': 0, 'stress': 30, 'businessGrowth': 1}},
            'optionC': {'text': 'Negotiate editorial independence in partnership', 'impacts': {'money': 30000, 'stress': 15, 'businessGrowth': 2}}
        }
    ],
    'Nursing': [
        {
            'text': '😴 The Shift Extension: You just finished an 8-hour shift. A colleague calls in sick for the night shift. The ward is understaffed. Your supervisor begs you to stay another 8 hours for ₦12k danger allowance. You\'re tired but that\'s ₦12k.',
            'optionA': {'text': 'Stay for the extra pay - patient safety is priority', 'impacts': {'money': 12000, 'stress': 25, 'businessGrowth': 0}},
            'optionB': {'text': 'Go home - exhausted nurses make mistakes', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': 1}},
            'optionC': {'text': 'Stay 4 hours and train someone for remaining time', 'impacts': {'money': 6000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '💨 Oxygen Crisis: ICU has oxygen cylinders for 5 hours but need to serve 10 patients for 12 hours. Supplier promises delivery "by tomorrow." You can\'t ration oxygen safely.',
            'optionA': {'text': 'Call other hospitals and beg for emergency supply', 'impacts': {'money': -2000, 'stress': -15, 'businessGrowth': 2}},
            'optionB': {'text': 'Ration carefully and hope for the best', 'impacts': {'money': 0, 'stress': 35, 'businessGrowth': 0}},
            'optionC': {'text': 'Contact health ministry emergency hotline', 'impacts': {'money': -500, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '💉 Near Miss: You ALMOST gave a patient the wrong medication. Caught it at the last second. No one noticed. You\'re supposed to report near-misses but it makes you look bad on your record.',
            'optionA': {'text': 'Report it immediately (does the right thing)', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 2}},
            'optionB': {'text': 'Keep it quiet - no harm, no foul', 'impacts': {'money': 0, 'stress': -5, 'businessGrowth': -2}},
            'optionC': {'text': 'Report it to your supervisor informally', 'impacts': {'money': 0, 'stress': 5, 'businessGrowth': 1}}
        },
        {
            'text': '🏥 Patient Abuse Witness: You witness a senior nurse roughly handling an elderly patient. It\'s not severe enough to report officially, but it\'s inappropriate. The senior nurse has been there 20+ years and mentors staff. Speaking up will ostracize you.',
            'optionA': {'text': 'Report it to management immediately', 'impacts': {'money': 0, 'stress': 15, 'businessGrowth': 1}},
            'optionB': {'text': 'Talk to the nurse privately first', 'impacts': {'money': 0, 'stress': 25, 'businessGrowth': 0}},
            'optionC': {'text': 'Document incidents and report to ethics committee', 'impacts': {'money': 0, 'stress': 20, 'businessGrowth': 1}}
        },
        {
            'text': '😰 Burnout Breaking Point: You\'ve worked 60+ hours/week for the past year. Your marriage is suffering, you\'re depressed, and you\'re making mistakes. But you\'re the breadwinner and can\'t afford to take time off.',
            'optionA': {'text': 'Take a 3-month unpaid leave for mental health', 'impacts': {'money': -30000, 'stress': -40, 'businessGrowth': 0}},
            'optionB': {'text': 'Push through and keep working (high risk)', 'impacts': {'money': 15000, 'stress': 50, 'businessGrowth': -1}},
            'optionC': {'text': 'Negotiate reduced hours with hospital administration', 'impacts': {'money': -5000, 'stress': -20, 'businessGrowth': 0}}
        },
        {
            'text': '🎓 Education vs Work: You\'ve been accepted to a Master\'s program (₦5M/year) that would lead to better positions. But it requires 2 years part-time study while working. Your family thinks you\'re abandoning them.',
            'optionA': {'text': 'Enroll in the Master\'s and commit to growth', 'impacts': {'money': -25000, 'stress': 25, 'businessGrowth': 5}},
            'optionB': {'text': 'Stay in current job and skip further education', 'impacts': {'money': 8000, 'stress': -10, 'businessGrowth': 0}},
            'optionC': {'text': 'Apply for scholarship/grant to reduce family burden', 'impacts': {'money': -5000, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '⚠️ Medication Error Discovery: You realize a medication you administered 2 days ago was 10x the correct dosage. The patient survived but it was luck. You have to report it but it could end your career.',
            'optionA': {'text': 'Report it immediately and face consequences', 'impacts': {'money': -10000, 'stress': 30, 'businessGrowth': 2}},
            'optionB': {'text': 'Stay silent - they survived after all', 'impacts': {'money': 0, 'stress': 60, 'businessGrowth': -5}},
            'optionC': {'text': 'Report immediately and implement system check', 'impacts': {'money': -5000, 'stress': 35, 'businessGrowth': 2}}
        },
        {
            'text': '💐 Private Nursing Offer: A wealthy family offers you ₦400k/month to care exclusively for their terminally ill father (24/7 care, basically imprisonment). You\'d be rich but lose personal freedom and your nursing career momentum.',
            'optionA': {'text': 'Take the lucrative private gig', 'impacts': {'money': 200000, 'stress': 10, 'businessGrowth': 0}},
            'optionB': {'text': 'Stay in the hospital system and maintain your career path', 'impacts': {'money': 15000, 'stress': 15, 'businessGrowth': 2}},
            'optionC': {'text': 'Recommend home healthcare team instead of solo care', 'impacts': {'money': 30000, 'stress': -5, 'businessGrowth': 1}}
        },
        {
            'text': '🚁 Unsafe Staffing Enforcement: Your hospital management keeps staffing below safe minimums to cut costs. You\'re witnessing patient safety compromise. Reporting them means losing your job; staying silent makes you complicit.',
            'optionA': {'text': 'Report to health authorities immediately', 'impacts': {'money': -25000, 'stress': -30, 'businessGrowth': 3}},
            'optionB': {'text': 'Document quietly and look for new job first', 'impacts': {'money': 0, 'stress': 45, 'businessGrowth': 0}},
            'optionC': {'text': 'Form nursing union to collectively negotiate staffing', 'impacts': {'money': -10000, 'stress': 30, 'businessGrowth': 2}}
        },
        {
            'text': '🎓 Advanced Specialist Path: A university wants you to lead their nursing research program (₦3M/year, prestige, but mostly desk work). Your hands-on patient care days would end. Your calling is direct patient care, not academia.',
            'optionA': {'text': 'Become the research program director', 'impacts': {'money': 150000, 'stress': -25, 'businessGrowth': 1}},
            'optionB': {'text': 'Stay bedside and turn down the offer', 'impacts': {'money': 15000, 'stress': 10, 'businessGrowth': 2}},
            'optionC': {'text': 'Negotiate hybrid role: part teaching, part patient care', 'impacts': {'money': 80000, 'stress': 0, 'businessGrowth': 3}}
        },
        {
            'text': '💼 ICU Leadership Position: You\'re offered to become ICU Unit Manager (₦50k/month raise, leadership responsibility, less patient contact). You love direct patient care but advancement requires administration.',
            'optionA': {'text': 'Accept management and grow your career', 'impacts': {'money': 50000, 'stress': 20, 'businessGrowth': 4}},
            'optionB': {'text': 'Decline and stay bedside nurse', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': 0}},
            'optionC': {'text': 'Take role with plan to return to bedside after 3 years', 'impacts': {'money': 25000, 'stress': 15, 'businessGrowth': 2}}
        },
        {
            'text': '🏥 Patient Family Violence: An angry family member physically attacks you over treatment decisions. Hospital security responds slowly. You\'re injured and traumatized. Management offers ₦50k hush money to not press charges.',
            'optionA': {'text': 'Press charges and pursue justice', 'impacts': {'money': 0, 'stress': 40, 'businessGrowth': 1}},
            'optionB': {'text': 'Accept hush money (feel violated)', 'impacts': {'money': 50000, 'stress': 50, 'businessGrowth': -3}},
            'optionC': {'text': 'Report to authorities and demand hospital policy changes', 'impacts': {'money': -20000, 'stress': 25, 'businessGrowth': 2}}
        },
        {
            'text': '🌡️ Pandemic Surge: COVID outbreak overwhelms your hospital. You\'re short PPE, staff is panicking, patients are dying. You\'re physically and mentally exhausted. Continuing is dangerous but leaving abandons patients.',
            'optionA': {'text': 'Continue working despite safety risks', 'impacts': {'money': 0, 'stress': 70, 'businessGrowth': 4}},
            'optionB': {'text': 'Take medical leave to protect yourself', 'impacts': {'money': -30000, 'stress': -40, 'businessGrowth': 0}},
            'optionC': {'text': 'Work limited shifts with mandatory rest days', 'impacts': {'money': -10000, 'stress': 40, 'businessGrowth': 2}}
        },
        {
            'text': '📱 Telehealth Nursing Career: Digital health platform offers ₦2M/year remote nursing position (consultations, triage, no 24-hour shifts). You\'d trade bedside care for work-life balance.',
            'optionA': {'text': 'Accept remote telehealth position', 'impacts': {'money': 100000, 'stress': -50, 'businessGrowth': 1}},
            'optionB': {'text': 'Stay in traditional bedside nursing', 'impacts': {'money': 15000, 'stress': 30, 'businessGrowth': 1}},
            'optionC': {'text': 'Hybrid: telehealth part-time + bedside part-time', 'impacts': {'money': 50000, 'stress': -20, 'businessGrowth': 1}}
        }
    ],
    'Agriculture': [
        {
            'text': '🐛 The Invasion: Your 30-hectare farm just got hit by armyworms. Within 48 hours, 40% of crops will be destroyed. Quality pesticides cost ₦2M but will save 80% of the remaining crop. Organic alternatives are slower.',
            'optionA': {'text': 'Buy heavy pesticides NOW - save the profit', 'impacts': {'money': -2000, 'stress': -15, 'businessGrowth': 1}},
            'optionB': {'text': 'Try organic methods - sustainable but lose money', 'impacts': {'money': -500, 'stress': 15, 'businessGrowth': 2}},
            'optionC': {'text': 'Use integrated pest management with limited pesticide', 'impacts': {'money': -1000, 'stress': 5, 'businessGrowth': 2}}
        },
        {
            'text': '💹 Price Shock: Fertilizer prices just doubled overnight (global shortage). You were planning to buy ₦4M worth for next season. Your profit margins are already thin. Prices might drop or go higher.',
            'optionA': {'text': 'Buy now at inflated prices (secure supply)', 'impacts': {'money': -4000, 'stress': 10, 'businessGrowth': 0}},
            'optionB': {'text': 'Wait and hope prices normalize (risk shortage)', 'impacts': {'money': 0, 'stress': 20, 'businessGrowth': 0}},
            'optionC': {'text': 'Buy 50% now, 50% later to hedge risks', 'impacts': {'money': -2000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '🌾 Weather Forecast: Meteorologists predict 60% chance of drought in the next 4 months. Planting season is HERE. Plant normally (risky) or switch to drought-resistant crops (lower yield).',
            'optionA': {'text': 'Plant drought-resistant crops to be safe', 'impacts': {'money': -1000, 'stress': -10, 'businessGrowth': 1}},
            'optionB': {'text': 'Plant normally and pray the forecast is wrong', 'impacts': {'money': 8000, 'stress': 25, 'businessGrowth': 0}},
            'optionC': {'text': 'Mix drought-resistant with traditional crops', 'impacts': {'money': 2000, 'stress': 10, 'businessGrowth': 2}}
        },
        {
            'text': '🚜 Equipment Breakdown: Your only tractor breaks down during harvest season. Repair costs ₦800k and takes 2 weeks. You can rent a tractor for ₦50k/day or hire manual laborers (slow but cheaper).',
            'optionA': {'text': 'Rent a tractor to finish harvest on time', 'impacts': {'money': -35000, 'stress': -10, 'businessGrowth': 0}},
            'optionB': {'text': 'Hire laborers and manage with what you have', 'impacts': {'money': -15000, 'stress': 30, 'businessGrowth': 0}},
            'optionC': {'text': 'Repair while renting temporary equipment', 'impacts': {'money': -70000, 'stress': 5, 'businessGrowth': 0}}
        },
        {
            'text': '📍 Land Dispute: A neighbor claims part of your farmland based on old colonial records. Legal battle will cost ₦5M and take 3+ years. Meanwhile, you can\'t farm that disputed area. Settle or fight?',
            'optionA': {'text': 'Settle out of court to keep the peace', 'impacts': {'money': -8000, 'stress': -20, 'businessGrowth': 0}},
            'optionB': {'text': 'Fight the case in court (expensive but principled)', 'impacts': {'money': -25000, 'stress': 40, 'businessGrowth': 2}},
            'optionC': {'text': 'Negotiate shared revenue arrangement', 'impacts': {'money': -2000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '💰 Debt Spiral: Your farming loans are due but recent poor harvests mean you only have 60% to pay back. Bank threatens to seize your land. You can take a predatory loan to bridge the gap or negotiate with the bank.',
            'optionA': {'text': 'Take the bridge loan at 25% interest', 'impacts': {'money': -30000, 'stress': 35, 'businessGrowth': -2}},
            'optionB': {'text': 'Negotiate directly with bank for a payment plan', 'impacts': {'money': -10000, 'stress': 15, 'businessGrowth': 0}},
            'optionC': {'text': 'Seek government agricultural subsidy/relief program', 'impacts': {'money': -5000, 'stress': 20, 'businessGrowth': 1}}
        },
        {
            'text': '🌱 Modern Farming Investment: AgriTech company offers to buy and modernize your farm into a ₦500M facility. You\'d have ₦150M. But your family has farmed this land for 80 years and it means losing your independence.',
            'optionA': {'text': 'Sell and take the financial security', 'impacts': {'money': 75000, 'stress': -25, 'businessGrowth': 0}},
            'optionB': {'text': 'Keep your family legacy and farm independently', 'impacts': {'money': 8000, 'stress': 20, 'businessGrowth': 2}},
            'optionC': {'text': 'Partnership with AgriTech while retaining ownership', 'impacts': {'money': 30000, 'stress': 0, 'businessGrowth': 4}}
        },
        {
            'text': '🐑 Livestock Disease: A highly contagious disease kills 40 of your 100 cattle. Vaccination for remaining cattle costs ₦2M. Your livestock income is wiped out for the season. Family is hungry. Sell your land or borrow more?',
            'optionA': {'text': 'Borrow ₦10M to recover and prevent spread', 'impacts': {'money': -50000, 'stress': 40, 'businessGrowth': -2}},
            'optionB': {'text': 'Sell part of your land to raise cash', 'impacts': {'money': 40000, 'stress': 30, 'businessGrowth': -3}},
            'optionC': {'text': 'Vaccinate and apply for government disaster relief', 'impacts': {'money': -20000, 'stress': 25, 'businessGrowth': 0}}
        },
        {
            'text': '🌍 Export Market Opportunity: A European buyer wants to import your organic produce (₦50M/year). You must certify organic and rebuild in 9 months. It requires ₦15M investment but could transform your farm.',
            'optionA': {'text': 'Invest and go for the European market', 'impacts': {'money': -75000, 'stress': 25, 'businessGrowth': 8}},
            'optionB': {'text': 'Stay local and avoid the risk', 'impacts': {'money': 8000, 'stress': -10, 'businessGrowth': 0}},
            'optionC': {'text': 'Form cooperative with neighboring farmers to meet scale', 'impacts': {'money': -40000, 'stress': 15, 'businessGrowth': 5}}
        },
        {
            'text': '🏡 Generational Decision: Your son wants to study agricultural engineering abroad (₦10M cost). He could modernize your farm or abandon it entirely. Do you invest in his education or demand he stay and farm?',
            'optionA': {'text': 'Fund his education and trust his vision', 'impacts': {'money': -50000, 'stress': -20, 'businessGrowth': 4}},
            'optionB': {'text': 'Demand he stay and learn traditional farming', 'impacts': {'money': 0, 'stress': 35, 'businessGrowth': 0}},
            'optionC': {'text': 'Scholarship search + internship program on farm', 'impacts': {'money': -20000, 'stress': 5, 'businessGrowth': 3}}
        },
        {
            'text': '💧 Irrigation System Crisis: Your water source dried up unexpectedly. Building a borehole costs ₦8M. Without water, crops fail in 3 weeks. Climate change is making this permanent problem.',
            'optionA': {'text': 'Invest in borehole immediately', 'impacts': {'money': -40000, 'stress': -10, 'businessGrowth': 2}},
            'optionB': {'text': 'Plant drought-tolerant crops and adapt', 'impacts': {'money': -5000, 'stress': 20, 'businessGrowth': 1}},
            'optionC': {'text': 'Join water management cooperative in region', 'impacts': {'money': -15000, 'stress': 10, 'businessGrowth': 2}}
        },
        {
            'text': '📊 Cooperative Membership Crisis: Your farming cooperative turned corrupt - officials embezzled ₦50M total funds/inputs. You\'re losing ₦3M this season. Stay and fight or leave and farm solo?',
            'optionA': {'text': 'Fight corruption and rebuild cooperative', 'impacts': {'money': -20000, 'stress': 50, 'businessGrowth': 3}},
            'optionB': {'text': 'Leave and farm independently', 'impacts': {'money': -10000, 'stress': 20, 'businessGrowth': 0}},
            'optionC': {'text': 'Form new ethical cooperative with honest farmers', 'impacts': {'money': -15000, 'stress': 30, 'businessGrowth': 4}}
        },
        {
            'text': '🌱 Climate-Smart Agriculture Training: Free government training on climate adaptation (requires 2 months time loss). Skills could transform productivity but you\'ll lose immediate harvest income.',
            'optionA': {'text': 'Attend training and invest in knowledge', 'impacts': {'money': -20000, 'stress': -30, 'businessGrowth': 5}},
            'optionB': {'text': 'Skip training and focus on immediate harvest', 'impacts': {'money': 15000, 'stress': 10, 'businessGrowth': -1}},
            'optionC': {'text': 'Send son to training while managing harvest', 'impacts': {'money': 0, 'stress': 15, 'businessGrowth': 2}}
        },
        {
            'text': '🎯 Premium Market vs Volume: A specialty buyer wants your rare heirloom crops at 10x market price but only small quantities. Your current bulk buyers offer lower prices but reliable volume. Which strategy?',
            'optionA': {'text': 'Pivot to premium market specialty crops', 'impacts': {'money': 50000, 'stress': 20, 'businessGrowth': 6}},
            'optionB': {'text': 'Stay with bulk/volume model', 'impacts': {'money': 15000, 'stress': 0, 'businessGrowth': 0}},
            'optionC': {'text': 'Dual model: specialty crops at premium + bulk sales', 'impacts': {'money': 30000, 'stress': 25, 'businessGrowth': 4}}
        }
    ],
    'Political Science': [
        {
            'text': '🎪 Campaign Launch: You\'re managing a political campaign. Election is 4 weeks away. You need to reach rural voters ASAP. A rental campaign vehicle costs ₦500k/week but gets you to 10 communities.',
            'optionA': {'text': 'Rent the vehicle - visibility matters', 'impacts': {'money': -500, 'stress': -10, 'businessGrowth': 2}},
            'optionB': {'text': 'Use social media only (cheaper but digitally divide rural)', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 0}},
            'optionC': {'text': 'Combine vehicle + mobile outreach for efficiency', 'impacts': {'money': -250, 'stress': 5, 'businessGrowth': 2}}
        },
        {
            'text': '🤝 Community Tension: You\'re holding a rally in a historically tense community. Two rival groups start posturing toward violence. Your team is panicking. You have 2 minutes to decide.',
            'optionA': {'text': 'De-escalate by pausing and addressing both groups', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 2}},
            'optionB': {'text': 'End the rally early to preserve safety', 'impacts': {'money': -2000, 'stress': -20, 'businessGrowth': 0}},
            'optionC': {'text': 'Invite both groups for joint dialogue session', 'impacts': {'money': -500, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '💰 Suspicious Donation: A wealthy businessman offers ₦30M for your campaign. He subtly hints at expecting policy favors later (contracts, tax breaks). You REALLY need the money. He hasn\'t explicitly said the demands.',
            'optionA': {'text': 'Take the money without committing to anything', 'impacts': {'money': 30000, 'stress': 25, 'businessGrowth': -2}},
            'optionB': {'text': 'Politely refuse and stick to grassroots funding', 'impacts': {'money': 0, 'stress': -10, 'businessGrowth': 1}},
            'optionC': {'text': 'Accept but inform him no quid pro quo exists', 'impacts': {'money': 15000, 'stress': 30, 'businessGrowth': 0}}
        },
        {
            'text': '🗳️ Election Rigging Reports: Your party\'s rival is clearly rigging votes in 3 states. You have evidence. Going public will cause massive chaos and potential violence. Staying silent wins you the election.',
            'optionA': {'text': 'Expose the rigging publicly (lose the election)', 'impacts': {'money': 0, 'stress': -25, 'businessGrowth': 5}},
            'optionB': {'text': 'Stay silent and win through fraud (win dirty)', 'impacts': {'money': 40000, 'stress': 45, 'businessGrowth': -5}},
            'optionC': {'text': 'Report to election commission privately first', 'impacts': {'money': -5000, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '📻 Scandal Surfaces: Leaked videos show your candidate accepting a bribe 5 years ago (before they entered politics). The videos are fake deepfakes but they\'re convincing. Your rival is spreading them. Deny or acknowledge?',
            'optionA': {'text': 'Aggressively deny and blame rival', 'impacts': {'money': -10000, 'stress': 35, 'businessGrowth': -1}},
            'optionB': {'text': 'Acknowledge past and emphasize change', 'impacts': {'money': -5000, 'stress': 10, 'businessGrowth': 2}},
            'optionC': {'text': 'Provide technical evidence of deepfakes', 'impacts': {'money': -8000, 'stress': 20, 'businessGrowth': 1}}
        },
        {
            'text': '🏛️ Ethnic Politics Pressure: Your party wants you to campaign using divisive ethnic rhetoric to turn out your community. It\'ll work but perpetuates harmful stereotypes. Your principles vs victory.',
            'optionA': {'text': 'Use the ethnic rhetoric and win decisively', 'impacts': {'money': 50000, 'stress': 40, 'businessGrowth': -4}},
            'optionB': {'text': 'Run an inclusive campaign and risk losing', 'impacts': {'money': 10000, 'stress': -10, 'businessGrowth': 3}},
            'optionC': {'text': 'Emphasize community pride without divisiveness', 'impacts': {'money': 25000, 'stress': 15, 'businessGrowth': 2}}
        },
        {
            'text': '🤐 Whistleblower Secret: An insider tells you that your party\'s leadership has been embezzling campaign funds (₦200M). Reporting it exposes your party\'s hypocrisy but tanks your election chances.',
            'optionA': {'text': 'Report it immediately and sacrifice the election', 'impacts': {'money': -15000, 'stress': -30, 'businessGrowth': 5}},
            'optionB': {'text': 'Wait until after elections to report it quietly', 'impacts': {'money': 30000, 'stress': 50, 'businessGrowth': -3}},
            'optionC': {'text': 'Inform party leadership to recover funds internally', 'impacts': {'money': 5000, 'stress': 35, 'businessGrowth': 0}}
        },
        {
            'text': '🎖️ Victory and Compromise: You won! But your party leadership wants you to support a corrupt bill in exchange for ministerial position. You promised voters transparency and integrity. Your career vs your principles.',
            'optionA': {'text': 'Support the bill and become minister', 'impacts': {'money': 100000, 'stress': 30, 'businessGrowth': -3}},
            'optionB': {'text': 'Reject it publicly and lose the party\'s support', 'impacts': {'money': 20000, 'stress': -20, 'businessGrowth': 4}},
            'optionC': {'text': 'Negotiate honest amendments to the bill', 'impacts': {'money': 50000, 'stress': 15, 'businessGrowth': 1}}
        },
        {
            'text': '🌟 Kingmaker Status: You\'re now the swing vote for the presidency. Both candidates offer you anything you want (money, power, influence). You can shape the nation or become complicit in corruption.',
            'optionA': {'text': 'Use leverage to demand policy reforms', 'impacts': {'money': 30000, 'stress': -25, 'businessGrowth': 5}},
            'optionB': {'text': 'Sell your vote to the highest bidder', 'impacts': {'money': 150000, 'stress': 50, 'businessGrowth': -4}},
            'optionC': {'text': 'Support candidate with better governance record', 'impacts': {'money': 10000, 'stress': -15, 'businessGrowth': 3}}
        },
        {
            'text': '🏛️ Leadership Legacy: Now in high office, you can either fight corruption head-on (career suicide) or quietly accumulate wealth like everyone else. What kind of leader will you be remembered as?',
            'optionA': {'text': 'Fight corruption and become a legendary hero', 'impacts': {'money': 0, 'stress': -40, 'businessGrowth': 10}},
            'optionB': {'text': 'Play it safe and become quietly wealthy', 'impacts': {'money': 200000, 'stress': 45, 'businessGrowth': -3}},
            'optionC': {'text': 'Quietly fund anti-corruption initiatives', 'impacts': {'money': 50000, 'stress': 0, 'businessGrowth': 4}}
        },
        {
            'text': '💡 Youth Movement Backlash: Your pro-youth policies alienate older power brokers. You\'re losing political capital and crucial alliances. Pivot to appease the old guard or double down on youth?',
            'optionA': {'text': 'Double down and build new youth coalition', 'impacts': {'money': -20000, 'stress': 30, 'businessGrowth': 6}},
            'optionB': {'text': 'Compromise with old guard to regain influence', 'impacts': {'money': 40000, 'stress': -10, 'businessGrowth': -2}},
            'optionC': {'text': 'Build coalition bridging youth and experienced leaders', 'impacts': {'money': 10000, 'stress': 20, 'businessGrowth': 4}}
        },
        {
            'text': '🌍 International Pressure: Foreign nations are pressuring you on human rights record. You can implement reforms (lose support from security forces) or maintain status quo (lose international credibility).',
            'optionA': {'text': 'Implement genuine human rights reforms', 'impacts': {'money': -50000, 'stress': 20, 'businessGrowth': 4}},
            'optionB': {'text': 'Maintain status quo and appease security forces', 'impacts': {'money': 60000, 'stress': 10, 'businessGrowth': -3}},
            'optionC': {'text': 'Gradual implementation with security sector engagement', 'impacts': {'money': 10000, 'stress': 15, 'businessGrowth': 2}}
        },
        {
            'text': '📰 Media Criticism Response: Opposition media is criticizing your policies relentlessly (some fair, some unfair). You can restrict media outlets (authoritarian) or engage transparently (slow results).',
            'optionA': {'text': 'Threaten/restrict media for balance', 'impacts': {'money': 30000, 'stress': 20, 'businessGrowth': -5}},
            'optionB': {'text': 'Engage transparently with media and public', 'impacts': {'money': -10000, 'stress': -20, 'businessGrowth': 3}},
            'optionC': {'text': 'Fund fact-checking organization for accuracy', 'impacts': {'money': -20000, 'stress': 0, 'businessGrowth': 2}}
        },
        {
            'text': '🏦 Economic Crisis Management: Recession hits hard. You can implement painful austerity (loses support) or spend to stimulate (huge debt). Your reelection depends on economic performance.',
            'optionA': {'text': 'Implement austerity measures', 'impacts': {'money': 100000, 'stress': 40, 'businessGrowth': -5}},
            'optionB': {'text': 'Spend aggressively on stimulus', 'impacts': {'money': 50000, 'stress': 10, 'businessGrowth': 3}},
            'optionC': {'text': 'Balanced approach: targeted stimulus + efficiency', 'impacts': {'money': 30000, 'stress': 20, 'businessGrowth': 2}}
        },
        {
            'text': '⚡ Democratic Backsliding Temptation: Your poll numbers are dropping. An advisor suggests consolidating power (extend term limits, restrict opposition). You could stay in power but damage democracy.',
            'optionA': {'text': 'Consolidate power to stay in office', 'impacts': {'money': 80000, 'stress': 50, 'businessGrowth': -10}},
            'optionB': {'text': 'Step down as democracy intended', 'impacts': {'money': 0, 'stress': -50, 'businessGrowth': 5}},
            'optionC': {'text': 'Rebuild popular support through genuine governance', 'impacts': {'money': 20000, 'stress': 20, 'businessGrowth': 4}}
        }
    ],
    'Education': [
        {
            'text': '👨‍🎓 Class Overcrowding: Your class grew from 35 to 58 students overnight. The school has no extra classrooms. The workload is overwhelming. You can\'t mark papers or maintain standards. Principal says "make it work."',
            'optionA': {'text': 'Implement peer-teaching and group learning', 'impacts': {'money': 0, 'stress': 15, 'businessGrowth': 1}},
            'optionB': {'text': 'Reduce content coverage to maintain quality', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 2}},
            'optionC': {'text': 'Request temporary teaching assistant support', 'impacts': {'money': -5000, 'stress': 5, 'businessGrowth': 1}}
        },
        {
            'text': '💵 Salary Crisis: You haven\'t been paid in 3 months. Bills are mounting. Rent is due. Your neighbor just got paid as a bus driver and you have a degree. Other teachers are planning a strike next week.',
            'optionA': {'text': 'Join the strike to force payment (lose pay until resolved)', 'impacts': {'money': -10000, 'stress': 20, 'businessGrowth': 2}},
            'optionB': {'text': 'Keep teaching and negotiate individually with school', 'impacts': {'money': 0, 'stress': 30, 'businessGrowth': 0}},
            'optionC': {'text': 'Seek alternative income (tutoring) while teaching', 'impacts': {'money': 10000, 'stress': 25, 'businessGrowth': 1}}
        },
        {
            'text': '📚 The Cheating Ring: You catch 5 top students cheating on the final exam. If you report it, they lose university admission. If you stay quiet, you compromise academic integrity. They\'re from poor homes.',
            'optionA': {'text': 'Report it officially - rules exist for a reason', 'impacts': {'money': 0, 'stress': 15, 'businessGrowth': 1}},
            'optionB': {'text': 'Give them a chance to confess and retake quietly', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 2}},
            'optionC': {'text': 'Find out their circumstances and offer support', 'impacts': {'money': -5000, 'stress': 5, 'businessGrowth': 2}}
        },
        {
            'text': '⚠️ Student Assault: A parent comes to school intoxicated and physically attacks you over a poor grade. You\'re injured but the parent has political connections. School pressures you to drop charges to avoid trouble.',
            'optionA': {'text': 'Press charges and pursue justice', 'impacts': {'money': -5000, 'stress': 35, 'businessGrowth': 2}},
            'optionB': {'text': 'Accept the compromise and move on', 'impacts': {'money': 5000, 'stress': 40, 'businessGrowth': -2}},
            'optionC': {'text': 'Press charges but accept school mediation', 'impacts': {'money': 0, 'stress': 25, 'businessGrowth': 1}}
        },
        {
            'text': '💻 Curriculum Clash: Ministry mandates a new curriculum that you believe is inferior and wastes student potential. But following it earns ₦200k bonus. Defying it risks your job but honors your integrity.',
            'optionA': {'text': 'Follow the new curriculum for the bonus', 'impacts': {'money': 10000, 'stress': 20, 'businessGrowth': -1}},
            'optionB': {'text': 'Teach what you believe is right and decline the bonus', 'impacts': {'money': 0, 'stress': -15, 'businessGrowth': 2}},
            'optionC': {'text': 'Supplement official curriculum with better materials', 'impacts': {'money': 5000, 'stress': 10, 'businessGrowth': 1}}
        },
        {
            'text': '👥 Favoritism Pressure: School administration asks you to inflate grades for their children. You resist. Now you\'re blacklisted from promotions and given the worst class. Your integrity costs your career.',
            'optionA': {'text': 'Stand firm and accept the career setback', 'impacts': {'money': -20000, 'stress': 25, 'businessGrowth': 2}},
            'optionB': {'text': 'Give in to survive and feed your family', 'impacts': {'money': 15000, 'stress': 45, 'businessGrowth': -3}},
            'optionC': {'text': 'Document discrimination and file formal complaint', 'impacts': {'money': -10000, 'stress': 40, 'businessGrowth': 2}}
        },
        {
            'text': '🏆 International Opportunity: You\'re selected for a 2-year teacher exchange program in Canada (₦5M+ experience and career boost). But your school refuses to release you and threatens to sue if you leave. Your dream vs contractual obligation.',
            'optionA': {'text': 'Take the international opportunity', 'impacts': {'money': 30000, 'stress': 20, 'businessGrowth': 5}},
            'optionB': {'text': 'Honor your contract and stay in Nigeria', 'impacts': {'money': 8000, 'stress': 10, 'businessGrowth': 0}},
            'optionC': {'text': 'Negotiate early release from school contract', 'impacts': {'money': -5000, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '🎓 Gifted Mediocre Situation: Your most promising student comes from a poor background. He has potential for top university but lacks money for entrance exams and prep. You can loan him ₦500k or he loses the opportunity.',
            'optionA': {'text': 'Loan him the ₦500k from your savings', 'impacts': {'money': -25000, 'stress': -20, 'businessGrowth': 3}},
            'optionB': {'text': 'Help him find scholarships instead of lending', 'impacts': {'money': 0, 'stress': 15, 'businessGrowth': 2}},
            'optionC': {'text': 'Pool resources with other teachers to fund him', 'impacts': {'money': -10000, 'stress': 5, 'businessGrowth': 2}}
        },
        {
            'text': '📊 Standardized Testing Crisis: Government mandates that students pass national exams or you lose ₦5M in funding. Teaching to the test destroys creative learning. Your students suffer but school survives.',
            'optionA': {'text': 'Teach to the test and keep funding', 'impacts': {'money': 25000, 'stress': 35, 'businessGrowth': -2}},
            'optionB': {'text': 'Teach real skills and lose the funding', 'impacts': {'money': -25000, 'stress': -15, 'businessGrowth': 3}},
            'optionC': {'text': 'Balance test prep with deeper learning', 'impacts': {'money': 10000, 'stress': 20, 'businessGrowth': 2}}
        },
        {
            'text': '🌟 Life-Changing Moment: One of your struggling students just got accepted to Oxford on full scholarship. You wrote the recommendation letter that changed their life. This is why you teach. But your salary is ₦500k/month.',
            'optionA': {'text': 'Continue teaching for the impact despite low pay', 'impacts': {'money': 0, 'stress': -35, 'businessGrowth': 3}},
            'optionB': {'text': 'Quit and take a corporate training job (₦3M/month)', 'impacts': {'money': 150000, 'stress': 20, 'businessGrowth': 0}},
            'optionC': {'text': 'Teach part-time while building coaching business', 'impacts': {'money': 50000, 'stress': -10, 'businessGrowth': 2}}
        },
        {
            'text': '🏫 Mentorship Program Launch: You want to start a mentorship program for underprivileged students (3 hours/week, unpaid). School refuses to sponsor it officially but won\'t prevent you. You take on extra work for nothing.',
            'optionA': {'text': 'Launch the program in your spare time', 'impacts': {'money': -10000, 'stress': 10, 'businessGrowth': 5}},
            'optionB': {'text': 'Focus on your paying job and personal life', 'impacts': {'money': 0, 'stress': 0, 'businessGrowth': 0}},
            'optionC': {'text': 'Seek NGO partnership to fund and support program', 'impacts': {'money': -5000, 'stress': 5, 'businessGrowth': 4}}
        },
        {
            'text': '📱 EdTech Integration: Your school wants to adopt expensive online learning platform (₦50M setup + ₦10M/year). It requires teacher retraining but could reach more students. Budget is tight.',
            'optionA': {'text': 'Invest in EdTech transformation', 'impacts': {'money': -300000, 'stress': 25, 'businessGrowth': 5}},
            'optionB': {'text': 'Maintain traditional teaching methods', 'impacts': {'money': 0, 'stress': -5, 'businessGrowth': -1}},
            'optionC': {'text': 'Pilot EdTech with one class first', 'impacts': {'money': -100000, 'stress': 15, 'businessGrowth': 2}}
        },
        {
            'text': '🎯 University Teaching Offer: Your university offers you a lecturer position (₦2M/year, prestige, research). You\'d teach fewer contact hours but lose direct student impact. The salary is double what you currently earn.',
            'optionA': {'text': 'Accept university position for advancement', 'impacts': {'money': 100000, 'stress': -10, 'businessGrowth': 2}},
            'optionB': {'text': 'Stay in secondary school with students you love', 'impacts': {'money': 0, 'stress': 10, 'businessGrowth': 1}},
            'optionC': {'text': 'Take university position while mentoring secondary students', 'impacts': {'money': 80000, 'stress': 15, 'businessGrowth': 3}}
        },
        {
            'text': '💡 Curriculum Innovation Project: You can develop a revolutionary teaching method that could transform education in Nigeria. It requires 2 years of unpaid research/development. Fame and impact OR financial stability?',
            'optionA': {'text': 'Dedicate 2 years to curriculum innovation', 'impacts': {'money': -100000, 'stress': -30, 'businessGrowth': 10}},
            'optionB': {'text': 'Stay in secure teaching job', 'impacts': {'money': 20000, 'stress': 10, 'businessGrowth': 0}},
            'optionC': {'text': 'Pursue innovation with grants/NGO funding', 'impacts': {'money': -20000, 'stress': -10, 'businessGrowth': 7}}
        },
        {
            'text': '🌍 Study Abroad Program Director: Ministry offers you lead role for study abroad scholarship program (₦100M budget, ₦5M salary). You\'d determine who gets life-changing opportunities. Political pressure to favor certain regions.',
            'optionA': {'text': 'Accept and distribute scholarships fairly', 'impacts': {'money': 250000, 'stress': 30, 'businessGrowth': 3}},
            'optionB': {'text': 'Decline to avoid political pressure', 'impacts': {'money': 5000, 'stress': -20, 'businessGrowth': 0}},
            'optionC': {'text': 'Accept but establish transparent merit-based criteria', 'impacts': {'money': 200000, 'stress': 40, 'businessGrowth': 4}}
        }
    ]
}

# ============ LIFE SIMULATOR SCENARIOS ============
# Age-based random events for the Life Simulator
# Organized by age range: baby (0-5), student (6-18), adult (19+)
LIFE_SCENARIOS = {
    'baby': [  # Age 0-5
        {
            'text': '👶 Learning to Walk: Your parents encourage you to take your first steps. Do you try to walk?',
            'optionA': {'text': 'Take a big step forward boldly', 'impacts': {'health': -10, 'happiness': 10}},
            'optionB': {'text': 'Stay safe and crawl for now', 'impacts': {'health': 5, 'happiness': 5}},
            'optionC': {'text': 'Hold onto furniture and practice carefully', 'impacts': {'health': 2, 'happiness': 8}}
        },
        {
            'text': '🥦 Eating Vegetables: Your parents offer broccoli for lunch. Do you eat it?',
            'optionA': {'text': 'Eat all the broccoli - build strong immunity', 'impacts': {'health': 15, 'happiness': -5}},
            'optionB': {'text': 'Refuse and cry for dessert', 'impacts': {'health': -5, 'happiness': 10}},
            'optionC': {'text': 'Eat half after negotiating for a fruit reward', 'impacts': {'health': 8, 'happiness': 5}}
        },
        {
            'text': '📚 First Words: You learn your first words. What do you say?',
            'optionA': {'text': '"Mama" - make everyone happy', 'impacts': {'smarts': 5, 'happiness': 15}},
            'optionB': {'text': '"No" - assert independence early', 'impacts': {'smarts': 3, 'happiness': -5}},
            'optionC': {'text': '"More" - show intelligence', 'impacts': {'smarts': 10, 'happiness': 10}}
        },
        {
            'text': '🧸 Toy Sharing: Another child wants your favorite toy. Do you share?',
            'optionA': {'text': 'Happily share and make a friend', 'impacts': {'happiness': 15, 'health': 5}},
            'optionB': {'text': 'Refuse - it\'s your toy!', 'impacts': {'happiness': -10, 'health': -5}},
            'optionC': {'text': 'Take turns fairly', 'impacts': {'happiness': 10, 'health': 3}}
        },
        {
            'text': '💤 Bedtime Routine: It\'s nap time. You\'re getting sleepy.',
            'optionA': {'text': 'Sleep immediately - good rest builds health', 'impacts': {'health': 20, 'happiness': 3}},
            'optionB': {'text': 'Fight sleep and stay up playing', 'impacts': {'health': -10, 'happiness': 10}},
            'optionC': {'text': 'Read a story first, then sleep', 'impacts': {'health': 15, 'smarts': 5, 'happiness': 8}}
        }
    ],
    'student': [  # Age 6-18
        {
            'text': '🎒 First Day of School: You\'re nervous about school. Do you make friends?',
            'optionA': {'text': 'Be outgoing - instantly popular', 'impacts': {'happiness': 15, 'looks': 5}},
            'optionB': {'text': 'Stay quiet at your desk', 'impacts': {'happiness': -10, 'smarts': 10}},
            'optionC': {'text': 'Be friendly but focus on studies', 'impacts': {'happiness': 8, 'smarts': 8}}
        },
        {
            'text': '👊 School Bully: A bully stole your lunch money. Do you fight back?',
            'optionA': {'text': 'Stand up physically - risk getting hurt', 'impacts': {'health': -20, 'looks': -5, 'happiness': -15}},
            'optionB': {'text': 'Tell a teacher - lose "cool" points', 'impacts': {'health': 5, 'happiness': -5, 'smarts': 5}},
            'optionC': {'text': 'Befriend the bully - convert enemy to ally', 'impacts': {'health': -5, 'happiness': 10, 'looks': 5}}
        },
        {
            'text': '📖 Library Book Discovery: You find an amazing book on coding. Do you read it?',
            'optionA': {'text': 'Read it obsessively - become a coding genius', 'impacts': {'smarts': 20, 'happiness': 5}},
            'optionB': {'text': 'Skip it to play video games', 'impacts': {'smarts': -5, 'happiness': 15}},
            'optionC': {'text': 'Read it slowly while also socializing', 'impacts': {'smarts': 12, 'happiness': 10}}
        },
        {
            'text': '💪 Sports Tryouts: You can try out for sports. Will you go for it?',
            'optionA': {'text': 'Train hard and make the team', 'impacts': {'health': 15, 'looks': 10, 'happiness': 12}},
            'optionB': {'text': 'Skip it - too much effort', 'impacts': {'health': -5, 'happiness': 0}},
            'optionC': {'text': 'Tryout casually without serious training', 'impacts': {'health': 5, 'looks': 3, 'happiness': 5}}
        },
        {
            'text': '🎨 Art Class Competition: Your art is entered in a school competition unexpectedly.',
            'optionA': {'text': 'Put your full effort in - perfectionist approach', 'impacts': {'looks': 15, 'happiness': 10, 'stress': 5}},
            'optionB': {'text': 'Don\'t stress - submit half-finished work', 'impacts': {'looks': -10, 'happiness': 5}},
            'optionC': {'text': 'Do your best with confidence', 'impacts': {'looks': 8, 'happiness': 8}}
        },
        {
            'text': '🎬 School Play Audition: Your drama teacher asks you to audition for the school play.',
            'optionA': {'text': 'Go for it - perform with confidence', 'impacts': {'looks': 12, 'happiness': 15, 'health': 3}},
            'optionB': {'text': 'Avoid the spotlight - stay home', 'impacts': {'looks': -5, 'happiness': -10}},
            'optionC': {'text': 'Audition for backstage crew instead', 'impacts': {'looks': 3, 'happiness': 8}}
        },
        {
            'text': '📊 Exam Week Stress: Final exams are here. You\'re stressed.',
            'optionA': {'text': 'Study 12 hours daily - ace everything', 'impacts': {'smarts': 20, 'health': -15, 'happiness': -10}},
            'optionB': {'text': 'Study minimally - wing it', 'impacts': {'smarts': -5, 'health': 5, 'happiness': 5}},
            'optionC': {'text': 'Study strategically 6 hours daily', 'impacts': {'smarts': 12, 'health': -3, 'happiness': 0}}
        },
        {
            'text': '💔 First Crush: Someone you like sits next to you in class. Say hello?',
            'optionA': {'text': 'Be brave and start a conversation', 'impacts': {'looks': 8, 'happiness': 12, 'smarts': -5}},
            'optionB': {'text': 'Pretend they don\'t exist - too nervous', 'impacts': {'looks': -5, 'happiness': -8}},
            'optionC': {'text': 'Be casual and friendly', 'impacts': {'looks': 3, 'happiness': 8}}
        },
        {
            'text': '🎵 Music Lessons: Your parents want you to learn an instrument or skip it?',
            'optionA': {'text': 'Commit fully - become a skilled musician', 'impacts': {'smarts': 10, 'looks': 8, 'happiness': 10}},
            'optionB': {'text': 'Refuse - focus on more "useful" subjects', 'impacts': {'smarts': 5, 'happiness': -5}},
            'optionC': {'text': 'Take lessons but at a relaxed pace', 'impacts': {'smarts': 6, 'happiness': 8}}
        },
        {
            'text': '💻 Computer Lab Access: You get access to the school computer lab. What do you do?',
            'optionA': {'text': 'Deep dive into programming - become a coder', 'impacts': {'smarts': 18, 'happiness': 10}},
            'optionB': {'text': 'Play games when teachers aren\'t looking', 'impacts': {'smarts': -5, 'happiness': 12}},
            'optionC': {'text': 'Learn coding basics while having fun', 'impacts': {'smarts': 10, 'happiness': 8}}
        }
    ],
    'adult': [  # Age 19+
        {
            'text': '🎓 University Choice: You\'ve been accepted to your dream university BUT in a different country.',
            'optionA': {'text': 'Go abroad for superior education', 'impacts': {'smarts': 15, 'money': -30000, 'happiness': 10}},
            'optionB': {'text': 'Stay home for family support', 'impacts': {'smarts': 5, 'money': 0, 'happiness': 5}},
            'optionC': {'text': 'Attend local top university - good compromise', 'impacts': {'smarts': 10, 'money': -10000, 'happiness': 8}}
        },
        {
            'text': '❤️ Long-term Relationship: Your relationship is getting serious. Move in together?',
            'optionA': {'text': 'Commit fully - move in together', 'impacts': {'happiness': 15, 'money': -5000, 'health': 8}},
            'optionB': {'text': 'Keep independence - stay apart', 'impacts': {'happiness': -10, 'money': 0, 'health': -3}},
            'optionC': {'text': 'Take it slow - weekends only', 'impacts': {'happiness': 10, 'money': -2000, 'health': 5}}
        },
        {
            'text': '💼 First Job Offer: Two companies want to hire you. One pays more, one offers growth.',
            'optionA': {'text': 'Take the high-paying job - ₦2M/month', 'impacts': {'money': 15000, 'smarts': -5, 'happiness': 10}},
            'optionB': {'text': 'Take the growth opportunity - ₦1M/month', 'impacts': {'money': 5000, 'smarts': 15, 'happiness': 12}},
            'optionC': {'text': 'Negotiate hybrid - ₦1.5M + learning path', 'impacts': {'money': 10000, 'smarts': 10, 'happiness': 10}}
        },
        {
            'text': '🏠 Housing Crisis: Rent is too high. Buy property using family loan?',
            'optionA': {'text': 'Take family loan - own home but obligated', 'impacts': {'money': -50000, 'happiness': 15, 'health': 10}},
            'optionB': {'text': 'Rent indefinitely - stay flexible', 'impacts': {'money': -5000, 'happiness': 5, 'health': -5}},
            'optionC': {'text': 'Save aggressively for 2 years then buy', 'impacts': {'money': -20000, 'happiness': 8, 'health': 3}}
        },
        {
            'text': '🚀 Start Your Own Business: You have a ₦3M idea. Risk it all?',
            'optionA': {'text': 'Go all in - quit job, invest ₦3M', 'impacts': {'money': -15000, 'smarts': 10, 'happiness': 15}},
            'optionB': {'text': 'Keep job, side hustle in evenings', 'impacts': {'money': 0, 'smarts': 8, 'happiness': 5}},
            'optionC': {'text': 'Get investors, risk is shared', 'impacts': {'money': 5000, 'smarts': 12, 'happiness': 12}}
        },
        {
            'text': '⚽ Fitness Reality Check: You\'ve gained weight. Join a gym?',
            'optionA': {'text': 'Get a trainer - ₦50k/month for results', 'impacts': {'health': 15, 'money': -2500, 'looks': 12}},
            'optionB': {'text': 'Do nothing - accept yourself', 'impacts': {'health': -5, 'happiness': 5, 'looks': -5}},
            'optionC': {'text': 'Gym routine with friends - free accountability', 'impacts': {'health': 10, 'happiness': 10, 'looks': 8}}
        },
        {
            'text': '✈️ Travel Opportunity: Your bestie invites you on a 2-week international trip.',
            'optionA': {'text': 'Go immediately - memories > money', 'impacts': {'happiness': 20, 'money': -10000, 'health': 8}},
            'optionB': {'text': 'Decline - too expensive or busy', 'impacts': {'happiness': -10, 'money': 0, 'health': -5}},
            'optionC': {'text': 'Go for 1 week - balance fun and finances', 'impacts': {'happiness': 14, 'money': -5000, 'health': 5}}
        },
        {
            'text': '👨‍👩‍👧 Having a Child: You\'re ready to be a parent. Have a child?',
            'optionA': {'text': 'Have the child now - life changes forever', 'impacts': {'happiness': 25, 'money': -20000, 'health': -10}},
            'optionB': {'text': 'Wait 5 more years - establish career first', 'impacts': {'happiness': -5, 'money': 0, 'health': 5}},
            'optionC': {'text': 'Have a child - but get solid support system first', 'impacts': {'happiness': 20, 'money': -10000, 'health': -5}}
        },
        {
            'text': '📊 Promotion vs Work-Life Balance: Get promoted to director BUT 80-hour weeks.',
            'optionA': {'text': 'Take the promotion - career over everything', 'impacts': {'money': 20000, 'happiness': -10, 'health': -15}},
            'optionB': {'text': 'Decline - protect your mental health', 'impacts': {'money': 0, 'happiness': 15, 'health': 10}},
            'optionC': {'text': 'Negotiate flexible director role', 'impacts': {'money': 12000, 'happiness': 8, 'health': 0}}
        },
        {
            'text': '🎯 Life Purpose Crisis: You feel unfulfilled. Make a major change?',
            'optionA': {'text': 'Radically pivot careers - uncertain but hopeful', 'impacts': {'smarts': 10, 'happiness': 15, 'money': -10000}},
            'optionB': {'text': 'Stay in safe job - ignore the emptiness', 'impacts': {'smarts': -5, 'happiness': -20, 'money': 5000}},
            'optionC': {'text': 'Invest in therapy and self-discovery', 'impacts': {'smarts': 8, 'happiness': 10, 'money': -2000}}
        }
    ]
}

# ============ SCENARIO TRANSFORMATION ============
def normalize_scenario(scenario_dict):
    """
    Transform scenario from internal format (optionA/optionB) to frontend format.
    
    Maps Python keys to JavaScript-expected keys:
    - 'text' -> 'description' (full scenario text)
    - Extracts 'title' from text (Day X - Title)
    - Transforms optionA/optionB -> choices array
    - Ensures all impacts have: money, stress, businessGrowth
    
    This ensures the frontend always receives the correct structure:
    {
        'day': int,
        'title': str,
        'description': str,
        'choices': [
            {'text': str, 'impacts': {'money': int, 'stress': int, 'businessGrowth': int}},
            {'text': str, 'impacts': {'money': int, 'stress': int, 'businessGrowth': int}}
        ]
    }
    
    Args:
        scenario_dict: Scenario with optionA and optionB keys
    
    Returns:
        Transformed scenario with all required fields
    """
    def normalize_impacts(impacts):
        """Ensure impacts dict has all required keys."""
        return {
            'money': impacts.get('money', 0),
            'stress': impacts.get('stress', 0),
            'businessGrowth': impacts.get('businessGrowth', 0)
        }
    
    def extract_title(text):
        """Extract title from text. Format: '🏥 Day 1 - The Call: Your text...'"""
        if not text:
            return 'Unknown Scenario'
        # Find the first colon, take everything before it
        if ':' in text:
            return text.split(':')[0].strip()
        return text[:50] + '...' if len(text) > 50 else text
    
    # Map scenario keys to frontend expectations
    normalized = {
        'day': scenario_dict.get('day'),
        'title': extract_title(scenario_dict.get('text')),  # Extract from text
        'description': scenario_dict.get('text'),  # Full text as description
        'text': scenario_dict.get('text'),  # Keep for backward compatibility
        'choices': []
    }
    
    # Convert optionA to choice 1
    if 'optionA' in scenario_dict:
        choice_a = scenario_dict['optionA'].copy()
        choice_a['impacts'] = normalize_impacts(choice_a.get('impacts', {}))
        normalized['choices'].append(choice_a)
    
    # Convert optionB to choice 2
    if 'optionB' in scenario_dict:
        choice_b = scenario_dict['optionB'].copy()
        choice_b['impacts'] = normalize_impacts(choice_b.get('impacts', {}))
        normalized['choices'].append(choice_b)
    
    # Convert optionC to choice 3
    if 'optionC' in scenario_dict:
        choice_c = scenario_dict['optionC'].copy()
        choice_c['impacts'] = normalize_impacts(choice_c.get('impacts', {}))
        normalized['choices'].append(choice_c)
    
    return normalized

# ============ ROUTES ============

@app.route('/signup', methods=['POST'])
def signup():
    """
    Sign up a new user.
    
    Expected JSON:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "securepassword",
        "field": "Medicine"
    }
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not all(k in data for k in ['name', 'email', 'password', 'field']):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: name, email, password, field'
            }), 400
        
        name = data['name'].strip()
        email = data['email'].strip()
        password = data['password']
        field = data['field'].strip()
        
        # Validate field
        if field not in MASTER_SCENARIOS:
            return jsonify({
                'success': False,
                'error': f'Invalid field. Available fields: {list(MASTER_SCENARIOS.keys())}'
            }), 400
        
        # Check password length
        if len(password) < 6:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 6 characters'
            }), 400
        
        # Hash password
        hashed_password = generate_password_hash(password)
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO users (username, email, password, field_of_study, money, stress, growth)
                VALUES (?, ?, ?, ?, 150000, 20, 0)
            ''', (name, email, hashed_password, field))
            conn.commit()
            
            user_id = cursor.lastrowid
            
            # Send welcome email (non-blocking - success doesn't affect registration)
            email_sent = send_welcome_email(email, name, field)
            
            email_msg = 'Welcome email sent!' if email_sent else 'Account created (welcome email could not be sent)'
            
            return jsonify({
                'success': True,
                'message': 'Account created successfully',
                'email_sent': email_sent,
                'email_status': email_msg,
                'user_id': user_id,
                'username': name,
                'email': email,
                'field': field,
                'starter_stats': {
                    'money': 150000,
                    'stress': 20,
                    'growth': 0,
                    'current_day': 1
                }
            }), 201
            
        except sqlite3.IntegrityError as e:
            if 'email' in str(e):
                return jsonify({
                    'success': False,
                    'error': 'Email already registered'
                }), 409
            elif 'username' in str(e):
                return jsonify({
                    'success': False,
                    'error': 'Username already taken'
                }), 409
            raise
        finally:
            conn.close()
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/login', methods=['POST'])
def login():
    """
    Log in a user.
    
    Expected JSON:
    {
        "email": "john@example.com",
        "password": "securepassword"
    }
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not all(k in data for k in ['email', 'password']):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: email, password'
            }), 400
        
        email = data['email'].strip()
        password = data['password']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 401
        
        # Check password
        if not check_password_hash(user['password'], password):
            return jsonify({
                'success': False,
                'error': 'Incorrect password'
            }), 401
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'field': user['field_of_study'],
            'current_day': user['current_day'],
            'stats': {
                'money': user['money'],
                'stress': user['stress'],
                'growth': user['growth']
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/get-daily-task', methods=['GET'])
def get_daily_task():
    """
    Get a daily scenario for a user.
    
    Query Parameters:
        - user_id: The user ID (required)
        - day: (Optional) Override day number (1-3), defaults to user's current_day
    
    Returns the scenario for Day 1, 2, or 3 based on the day parameter.
    Days cycle: 1, 2, 3, 1, 2, 3, ...
    """
    try:
        user_id = request.args.get('user_id', type=int)
        day_override = request.args.get('day', type=int)
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        # Fetch user from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Calculate which scenario day (1-3) to return
        # If override provided, use it; otherwise use current_day % 3
        if day_override:
            scenario_day = max(1, min(3, day_override))  # Clamp between 1-3
        else:
            # Cycle through days: current_day 1->day1, 2->day2, 3->day3, 4->day1, etc
            scenario_day = ((user['current_day'] - 1) % 3) + 1
        
        field = user['field_of_study']
        
        # Get scenarios for user's field
        if field not in MASTER_SCENARIOS:
            return jsonify({
                'success': False,
                'error': f'Invalid field: {field}'
            }), 400
        
        # Get the specific day's scenario (index 0, 1, or 2 for days 1, 2, 3)
        scenarios = MASTER_SCENARIOS[field]
        if scenario_day < 1 or scenario_day > len(scenarios):
            return jsonify({
                'success': False,
                'error': f'Scenario day {scenario_day} not available'
            }), 400
        
        selected_scenario = scenarios[scenario_day - 1]  # Convert day number to array index
        normalized_scenario = normalize_scenario(selected_scenario)  # Transform to frontend format
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'field': field,
            'current_day': user['current_day'],
            'scenario_day': scenario_day,
            'scenario': normalized_scenario
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/get-scenarios', methods=['GET'])
def get_scenarios():
    """
    Get scenario(s) from app.py (the ONLY source of scenarios).
    
    This is the PRIMARY endpoint for fetching scenarios.
    All frontend scenario requests should use this OR /api/scenario.
    
    Query Parameters (choose one):
        - field: Get all scenarios for a specific field (returns all 10 days)
        - field + day: Get specific scenario by field and day (1-10)
    
    Returns the scenario(s) for the specified criteria.
    """
    try:
        field = request.args.get('field', '').strip()
        day = request.args.get('day', type=int)
        
        if not field:
            return jsonify({
                'success': False,
                'error': 'field parameter is required'
            }), 400
        
        # Validate field
        if field not in MASTER_SCENARIOS:
            available_fields = sorted(list(MASTER_SCENARIOS.keys()))
            return jsonify({
                'success': False,
                'error': f'Invalid field. Available fields: {available_fields}'
            }), 400
        
        # If specific day requested
        if day is not None:
            if day < 1 or day > 10:
                return jsonify({
                    'success': False,
                    'error': 'day parameter must be between 1 and 10'
                }), 400
            
            # Get the specific scenario
            scenarios = MASTER_SCENARIOS[field]
            if day > len(scenarios):
                return jsonify({
                    'success': False,
                    'error': f'Day {day} not available for {field} (only {len(scenarios)} days available)'
                }), 400
            
            scenario = scenarios[day - 1]  # Convert day number to array index
            normalized_scenario = normalize_scenario(scenario)  # Transform to frontend format
            
            return jsonify({
                'success': True,
                'field': field,
                'day': day,
                'scenario': normalized_scenario
            }), 200
        
        # If no specific day, return all scenarios for the field
        scenarios = MASTER_SCENARIOS[field]
        normalized_scenarios = [normalize_scenario(s) for s in scenarios]  # Transform all scenarios
        return jsonify({
            'success': True,
            'field': field,
            'total_scenarios': len(normalized_scenarios),
            'scenarios': normalized_scenarios
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/update-stats', methods=['POST', 'OPTIONS'])
def update_stats():
    """
    Update user stats based on game progress.
    
    Expected JSON:
    {
        "username": "paul adamu",
        "money": 150000,
        "stress": 45,
        "age": 5,
        "health": 100,
        "happiness": 100,
        "smarts": 50,
        "looks": 50
    }
    """
    # Handle the "Preflight" OPTIONS request from browser CORS
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    
    try:
        data = request.get_json()
        
        # Validate input
        if 'username' not in data:
            return jsonify({
                'success': False,
                'error': 'username is required'
            }), 400
        
        username = data['username']
        money = data.get('money', 150000)
        stress = data.get('stress', 20)
        age = data.get('age', 0)
        health = data.get('health', 100)
        happiness = data.get('happiness', 100)
        smarts = data.get('smarts', 50)
        looks = data.get('looks', 50)
        
        # Validate values
        money = max(0, money)  # Money can't be negative
        stress = max(0, min(100, stress))  # Stress: 0-100
        age = max(0, age)  # Age can't be negative
        health = max(0, min(100, health))  # Health: 0-100
        happiness = max(0, min(100, happiness))  # Happiness: 0-100
        smarts = max(0, min(100, smarts))  # Smarts: 0-100
        looks = max(0, min(100, looks))  # Looks: 0-100
        
        conn = get_db_connection()  # Use the absolute path function
        cursor = conn.cursor()
        
        # Debug log
        import sys
        print(f"[DEBUG] updateStats: Updating user '{username}' with money={money}, stress={stress}, age={age}, health={health}, happiness={happiness}, smarts={smarts}, looks={looks}", file=sys.stderr)
        
        # Update user by username
        cursor.execute('''
            UPDATE users 
            SET money = ?, stress = ?, age = ?, health = ?, happiness = ?, smarts = ?, looks = ?, updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        ''', (money, stress, age, health, happiness, smarts, looks, username))
        
        # CRITICAL: Must commit to save changes to database
        conn.commit()
        affected_rows = cursor.rowcount
        print(f"[DEBUG] updateStats: Rows affected: {affected_rows}", file=sys.stderr)
        conn.close()
        print(f"[DEBUG] updateStats: Database connection closed", file=sys.stderr)
        
        if affected_rows == 0:
            return jsonify({
                'success': False,
                'error': f'User "{username}" not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'Stats updated successfully',
            'username': username,
            'updated_stats': {
                'money': money,
                'stress': stress,
                'age': age,
                'health': health,
                'happiness': happiness,
                'smarts': smarts,
                'looks': looks
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get user profile information."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'field': user['field_of_study'],
                'current_day': user['current_day'],
                'stats': {
                    'money': user['money'],
                    'stress': user['stress'],
                    'growth': user['growth']
                },
                'created_at': user['created_at'],
                'updated_at': user['updated_at']
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/all-fields', methods=['GET'])
def get_all_fields():
    """Get a list of all available fields of study."""
    return jsonify({
        'success': True,
        'fields': list(MASTER_SCENARIOS.keys()),
        'total': len(MASTER_SCENARIOS)
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint with diagnostic info."""
    try:
        diagnostic = {
            'status': 'ok',
            'service': 'JobSim Backend API',
            'db_path': DB_PATH,
            'db_exists': os.path.exists(DB_PATH)
        }
        
        # Try to connect to database
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            # Get user count
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            
            # Get leaderboard count (users with games played)
            cursor.execute("SELECT COUNT(*) FROM users WHERE total_games_played > 0")
            leaderboard_count = cursor.fetchone()[0]
            
            conn.close()
            
            diagnostic['db_status'] = 'connected'
            diagnostic['tables'] = tables
            diagnostic['user_count'] = user_count
            diagnostic['leaderboard_count'] = leaderboard_count
        except Exception as db_error:
            diagnostic['db_status'] = f'error: {str(db_error)}'
        
        return jsonify(diagnostic), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

# ============ LEADERBOARD ============
@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top players sorted by growth & money (only players who completed games)."""
    try:
        field = request.args.get('field', None)
        sort_by = request.args.get('sort', 'growth')
        
        if not os.path.exists(DB_PATH):
            return jsonify({'success': False, 'error': f'Database file not found at {DB_PATH}'}), 500
        

        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = '''
            SELECT id, username, field_of_study, money, growth, stress, current_day, total_games_played
            FROM users
        '''
        params = []
        
        if field:
            query += ' WHERE field_of_study = ?'
            params.append(field)
        
        if sort_by == 'money':
            query += ' ORDER BY money DESC, growth DESC LIMIT 10'
        elif sort_by == 'stress':
            query += ' ORDER BY stress ASC, money DESC LIMIT 10'
        else:
            query += ' ORDER BY growth DESC, money DESC LIMIT 10'
        
        cursor.execute(query, params)
        leaderboard = cursor.fetchall()
        conn.close()
        return jsonify({
            'success': True,
            'leaderboard': [dict(row) for row in leaderboard]
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }), 500

# ============ ACHIEVEMENTS ============
@app.route('/achievements/<int:user_id>', methods=['GET'])
def get_user_achievements(user_id):
    """Get all achievements for a user."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC', (user_id,))
        achievements = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'achievements': [dict(row) for row in achievements]
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/unlock-achievement', methods=['POST'])
def unlock_achievement():
    """Unlock an achievement for a user."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        achievement_name = data.get('achievement_name')
        achievement_icon = data.get('achievement_icon', '🏆')
        achievement_description = data.get('achievement_description', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO achievements (user_id, achievement_name, achievement_icon, achievement_description)
                VALUES (?, ?, ?, ?)
            ''', (user_id, achievement_name, achievement_icon, achievement_description))
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Achievement "{achievement_name}" unlocked!'
            }), 201
            
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Achievement already unlocked'
            }), 409
        finally:
            conn.close()
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ SETTINGS ============
@app.route('/settings/<int:user_id>', methods=['GET'])
def get_user_settings(user_id):
    """Get user settings."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM user_settings WHERE user_id = ?', (user_id,))
        settings = cursor.fetchone()
        conn.close()
        
        if not settings:
            # Return default settings
            return jsonify({
                'success': True,
                'settings': {
                    'sound_enabled': True,
                    'notifications_enabled': True,
                    'difficulty': 'normal',
                    'theme': 'dark',
                    'language': 'en'
                }
            }), 200
        
        return jsonify({
            'success': True,
            'settings': dict(settings)
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/settings/<int:user_id>', methods=['POST'])
def update_user_settings(user_id):
    """Update user settings."""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if settings exist
        cursor.execute('SELECT id FROM user_settings WHERE user_id = ?', (user_id,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE user_settings
                SET sound_enabled = ?, notifications_enabled = ?, difficulty = ?, theme = ?, language = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (data.get('sound_enabled', 1), data.get('notifications_enabled', 1), 
                  data.get('difficulty', 'normal'), data.get('theme', 'dark'), 
                  data.get('language', 'en'), user_id))
        else:
            cursor.execute('''
                INSERT INTO user_settings (user_id, sound_enabled, notifications_enabled, difficulty, theme, language)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, data.get('sound_enabled', 1), data.get('notifications_enabled', 1),
                  data.get('difficulty', 'normal'), data.get('theme', 'dark'),
                  data.get('language', 'en')))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Settings updated successfully'
        }), 200
    
    except Exception as e:
        conn.close()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ GAME COMPLETION ============
@app.route('/complete-game', methods=['POST'])
def complete_game():
    """Mark game as completed, update final stats, and unlock achievements."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        final_money = data.get('money', 0)
        final_stress = data.get('stress', 100)
        final_growth = data.get('growth', 0)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users
            SET game_completed = 1, 
                total_games_played = total_games_played + 1,
                money = ?,
                stress = ?,
                growth = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (final_money, final_stress, final_growth, user_id))
        
        conn.commit()
        
        # ============ AUTO-UNLOCK ACHIEVEMENTS ============
        achievements_to_unlock = []
        
        # 1. First Day - Can unlock after first play
        achievements_to_unlock.append({
            'name': 'First Day',
            'icon': '🎯',
            'description': 'Complete your first day',
            'condition': True  # Always unlock on game completion
        })
        
        # 2. Survivor - Complete all 30 days (game_completed = 1)
        achievements_to_unlock.append({
            'name': 'Survivor',
            'icon': '🏆',
            'description': 'Complete all 30 days',
            'condition': True  # If we got here, they completed it
        })
        
        # 3. Money Master - Earn ₦200k+
        if final_money >= 200000:
            achievements_to_unlock.append({
                'name': 'Money Master',
                'icon': '💰',
                'description': 'Earn ₦200k+',
                'condition': True
            })
        
        # 4. Zen Master - Keep stress ≤ 20%
        if final_stress <= 20:
            achievements_to_unlock.append({
                'name': 'Zen Master',
                'icon': '😌',
                'description': 'Keep stress ≤ 20%',
                'condition': True
            })
        
        # 5. Growth King - Achieve 300+ growth
        if final_growth >= 300:
            achievements_to_unlock.append({
                'name': 'Growth King',
                'icon': '📈',
                'description': 'Achieve 300+ growth',
                'condition': True
            })
        
        # 6. Perfect Balance - Ideal stats (Money > 150k, Stress < 50, Growth > 100)
        if final_money > 150000 and final_stress < 50 and final_growth > 100:
            achievements_to_unlock.append({
                'name': 'Perfect Balance',
                'icon': '⚖️',
                'description': 'Ideal stats',
                'condition': True
            })
        
        # 7. Smart Player - Never go broke (money never hit 0, assume if they completed game)
        if final_money > 0:
            achievements_to_unlock.append({
                'name': 'Smart Player',
                'icon': '🧠',
                'description': 'Never go broke',
                'condition': True
            })
        
        # Unlock all earned achievements
        for achievement in achievements_to_unlock:
            if achievement['condition']:
                try:
                    cursor.execute('''
                        INSERT OR IGNORE INTO achievements 
                        (user_id, achievement_name, achievement_icon, achievement_description)
                        VALUES (?, ?, ?, ?)
                    ''', (user_id, achievement['name'], achievement['icon'], achievement['description']))
                    conn.commit()
                except sqlite3.IntegrityError:
                    pass  # Already unlocked, ignore
        
        # Fetch updated user
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        # Fetch all unlocked achievements
        cursor.execute('SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC', (user_id,))
        achievements = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Game completed!',
            'user': dict(user),
            'achievements_unlocked': [dict(row) for row in achievements]
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ LIFE SIMULATOR ROUTES ============

def get_lifecycle_status(user):
    """Return lifecycle status and message."""
    if user is None:
        return 'unknown', 'User does not exist.'
    if user.get('health', 100) <= 0:
        return 'dead', '☠️ You are dead (health <= 0).'
    if user.get('age', 0) >= 90:
        return 'retired', '🎉 You are retired (age >= 90).'
    if user.get('money', 0) <= 0:
        return 'bankrupt', '💔 You are bankrupt (money <= 0).'
    if user.get('stress', 0) >= 100:
        return 'burned_out', '🤯 You are burned out (stress >= 100).'
    return 'alive', '🟢 You are alive.'


@app.route('/lifecycle-status', methods=['GET'])
def lifecycle_status():
    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({'success': False, 'error': 'user_id is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    status, message = get_lifecycle_status(dict(user))
    return jsonify({'success': True, 'status': status, 'message': message}), 200


@app.route('/age-up', methods=['POST'])
def age_up():
    """
    Increment player age and return a random life event.
    
    Request Body:
    {
        "user_id": int,
        "current_stats": {
            "health": int,
            "happiness": int,
            "smarts": int,
            "looks": int,
            "money": int
        }
    }
    
    Returns:
    {
        "success": true,
        "new_age": int,
        "category": "baby|student|adult",
        "event": {scenario object},
        "user": {updated user stats}
    }
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current user
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        user_info = dict(user)
        status, status_msg = get_lifecycle_status(user_info)
        if status in ['dead', 'retired', 'bankrupt', 'burned_out']:
            conn.close()
            return jsonify({
                'success': False,
                'error': status_msg,
                'lifecycle_status': status
            }), 400
        
        # Increment age
        new_age = user['age'] + 1
        
        # Determine life category based on age
        if new_age < 6:
            category = 'baby'
        elif new_age < 19:
            category = 'student'
        else:
            category = 'adult'
        
        # Select random event from the category
        if category not in LIFE_SCENARIOS:
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Invalid age category: {category}'
            }), 500
        
        events_in_category = LIFE_SCENARIOS[category]
        if not events_in_category:
            conn.close()
            return jsonify({
                'success': False,
                'error': f'No events available for {category}'
            }), 500
        
        event = random.choice(events_in_category)
        
        # Update user age in database
        cursor.execute('''
            UPDATE users
            SET age = ?
            WHERE id = ?
        ''', (new_age, user_id))
        
        conn.commit()
        
        # Fetch updated user
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        updated_user = cursor.fetchone()
        conn.close()
        
        status, status_msg = get_lifecycle_status(dict(updated_user))

        return jsonify({
            'success': True,
            'new_age': new_age,
            'category': category,
            'event': event,
            'user': dict(updated_user),
            'lifecycle_status': status,
            'lifecycle_message': status_msg
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/age-up/apply', methods=['POST'])
def apply_event_impacts():
    """
    Apply the impacts of a chosen life event to player stats.
    
    Request Body:
    {
        "user_id": int,
        "impacts": {
            "health": int,
            "happiness": int,
            "smarts": int,
            "looks": int,
            "money": int
        }
    }
    
    Returns:
    {
        "success": true,
        "user": {updated user stats}
    }
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        impacts = data.get('impacts', {})
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current user
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Calculate new stats (clamped between 0 and 100 for most stats)
        health = max(0, min(100, (user['health'] or 100) + impacts.get('health', 0)))
        happiness = max(0, min(100, (user['happiness'] or 100) + impacts.get('happiness', 0)))
        smarts = max(0, min(100, (user['smarts'] or 50) + impacts.get('smarts', 0)))
        looks = max(0, min(100, (user['looks'] or 50) + impacts.get('looks', 0)))
        money = max(0, (user['money'] or 0) + impacts.get('money', 0))  # Money can be huge
        
        # Update stats
        cursor.execute('''
            UPDATE users
            SET health = ?, happiness = ?, smarts = ?, looks = ?, money = ?
            WHERE id = ?
        ''', (health, happiness, smarts, looks, money, user_id))
        
        conn.commit()
        
        # Fetch updated user
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        updated_user = cursor.fetchone()
        conn.close()

        status, status_msg = get_lifecycle_status(dict(updated_user))
        
        return jsonify({
            'success': True,
            'user': dict(updated_user),
            'lifecycle_status': status,
            'lifecycle_message': status_msg
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/get-random-event', methods=['GET'])
def get_random_event():
    """
    Get a random life event based on player's age.
    
    Query Parameters:
    - age: int (player's current age)
    
    Returns:
    Random event object from LIFE_SCENARIOS
    """
    try:
        age = int(request.args.get('age', 0))
        
        if age < 5:
            category = "infant"
        elif age < 13:
            category = "child"
        elif age < 20:
            category = "teen"
        else:
            category = "adult"
            
        # Pick a random scenario from LIFE_SCENARIOS dictionary
        events = LIFE_SCENARIOS.get(category, LIFE_SCENARIOS['adult'])
        if not events:
            return jsonify({
                'success': False,
                'error': f'No events available for category: {category}'
            }), 404
            
        return jsonify(random.choice(events))
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/market', methods=['GET', 'POST'])
def market():
    """
    Cryptocurrency/Real Estate Market system.
    
    GET: Get current market prices
    POST: Buy/sell assets
    
    Request Body:
    {
        "user_id": int,
        "action": "buy|sell|view",
        "asset_type": "crypto|realestate",
        "amount": int
    }
    """
    try:
        if request.method == 'GET':
            # Generate random market prices
            crypto_price = random.randint(200000, 800000)  # ₦500k average
            realestate_price = random.randint(5000000, 15000000)  # ₦10M average
            
            return jsonify({
                'success': True,
                'market': {
                    'crypto': {
                        'name': 'BitCoin-NG',
                        'price': crypto_price,
                        'trend': random.choice(['📈 Up', '📉 Down', '➡️ Stable'])
                    },
                    'realestate': {
                        'name': 'Lekki Property',
                        'price': realestate_price,
                        'trend': random.choice(['📈 Rising', '📉 Falling', '➡️ Steady'])
                    }
                }
            }), 200
        
        else:  # POST
            data = request.get_json()
            user_id = data.get('user_id')
            action = data.get('action', 'view')
            asset_type = data.get('asset_type', 'crypto')
            amount = data.get('amount', 0)
            
            if not user_id:
                return jsonify({
                    'success': False,
                    'error': 'user_id is required'
                }), 400
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            user = cursor.fetchone()
            
            if not user:
                conn.close()
                return jsonify({
                    'success': False,
                    'error': 'User not found'
                }), 404
            
            # Generate market prices
            crypto_cost = random.randint(200000, 800000)
            realestate_cost = random.randint(5000000, 15000000)
            
            money = user['money']
            message = ''
            
            if action == 'buy':
                if asset_type == 'crypto':
                    cost = crypto_cost * amount
                    if money >= cost:
                        money -= cost
                        message = f'Bought {amount} units of BitCoin-NG for ₦{cost}'
                    else:
                        return jsonify({
                            'success': False,
                            'error': f'Not enough money. You have ₦{money}, need ₦{cost}'
                        }), 400
                elif asset_type == 'realestate':
                    cost = realestate_cost * amount
                    if money >= cost:
                        money -= cost
                        message = f'Purchased {amount} property for ₦{cost}'
                    else:
                        return jsonify({
                            'success': False,
                            'error': f'Not enough money. You have ₦{money}, need ₦{cost}'
                        }), 400
                
                # Update money
                cursor.execute('UPDATE users SET money = ? WHERE id = ?', (money, user_id))
                conn.commit()
            
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            updated_user = cursor.fetchone()
            conn.close()
            
            return jsonify({
                'success': True,
                'action': action,
                'message': message,
                'user': dict(updated_user)
            }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/lifestyle', methods=['POST'])
def lifestyle():
    """
    Lifestyle activities: Gym (health/looks), Study (smarts), Entertainment (happiness).
    
    Request Body:
    {
        "user_id": int,
        "activity": "gym|study|entertainment|rest",
        "duration": int (hours)
    }
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        activity = data.get('activity', 'rest')
        duration = data.get('duration', 1)
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Activity costs and impacts
        activities = {
            'gym': {
                'cost': 50000 * duration,
                'impacts': {
                    'health': 15 * duration,
                    'looks': 10 * duration,
                    'happiness': 5 * duration
                },
                'description': f'Spent {duration} hours at the gym 💪'
            },
            'study': {
                'cost': 30000 * duration,
                'impacts': {
                    'smarts': 20 * duration,
                    'happiness': -5 * duration
                },
                'description': f'Studied hard for {duration} hours 📚'
            },
            'entertainment': {
                'cost': 100000 * duration,
                'impacts': {
                    'happiness': 25 * duration,
                    'health': -5 * duration
                },
                'description': f'Had fun for {duration} hours 🎉'
            },
            'rest': {
                'cost': 0,
                'impacts': {
                    'health': 10 * duration,
                    'happiness': 8 * duration
                },
                'description': f'Rested for {duration} hours 😴'
            }
        }
        
        if activity not in activities:
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Unknown activity: {activity}'
            }), 400
        
        activity_data = activities[activity]
        cost = activity_data['cost']
        impacts = activity_data['impacts']
        
        # Check if user can afford it
        if user['money'] < cost:
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Cannot afford {activity}. You have ₦{user["money"]}, need ₦{cost}'
            }), 400
        
        # Apply impacts
        health = max(0, min(100, (user['health'] or 100) + impacts.get('health', 0)))
        happiness = max(0, min(100, (user['happiness'] or 100) + impacts.get('happiness', 0)))
        smarts = max(0, min(100, (user['smarts'] or 50) + impacts.get('smarts', 0)))
        looks = max(0, min(100, (user['looks'] or 50) + impacts.get('looks', 0)))
        money = user['money'] - cost
        
        # Update database
        cursor.execute('''
            UPDATE users
            SET health = ?, happiness = ?, smarts = ?, looks = ?, money = ?
            WHERE id = ?
        ''', (health, happiness, smarts, looks, money, user_id))
        
        conn.commit()
        
        # Fetch updated user
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        updated_user = cursor.fetchone()
        conn.close()
        
        return jsonify({
            'success': True,
            'activity': activity,
            'description': activity_data['description'],
            'cost': cost,
            'impacts': impacts,
            'user': dict(updated_user)
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ ROUTE ALIASES FOR CAMELCASE ============
# Frontend may call camelCase endpoints, so we create aliases
@app.route('/getScenarios', methods=['GET'])
def get_scenarios_alias():
    """Alias for /get-scenarios to support camelCase JS calls"""
    return get_scenarios()

@app.route('/updateStats', methods=['POST', 'OPTIONS'])
def update_stats_alias():
    """Alias for /update-stats to support camelCase JS calls"""
    return update_stats()

# ============ ERROR HANDLERS ============
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Route not found. Available endpoints: /signup, /login, /get-daily-task, /get-scenarios, /getScenarios, /update-stats, /updateStats, /user/<id>, /all-fields, /health'
    }), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'details': str(error)
    }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

