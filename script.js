// ============ AUTHENTICATION CHECK ============
function checkAuthentication() {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    // If user is not logged in, redirect to landing page
    if (!userId || !userEmail) {
        window.location.href = 'landing.html';
        return false;
    }
    
    return true;
}

// Check authentication before proceeding
if (!checkAuthentication()) {
    // Stop execution - user will be redirected
    throw new Error('User not authenticated');
}

// ============ LOAD THEME ON PAGE START ============
function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    if (theme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        }
    }
}

// ============ DIFFICULTY MULTIPLIER SYSTEM ============
function getDifficultyMultiplier() {
    const difficulty = localStorage.getItem('gameDifficulty') || 'normal';
    const multipliers = {
        'easy': { money: 1.5, stress: 0.5, growth: 0.8 },
        'normal': { money: 1.0, stress: 1.0, growth: 1.0 },
        'hard': { money: 0.7, stress: 1.5, growth: 1.3 },
        'nightmare': { money: 0.5, stress: 2.0, growth: 1.8 }
    };
    return multipliers[difficulty] || multipliers['normal'];
}

function applyDifficultyMultipliers(impacts) {
    const multiplier = getDifficultyMultiplier();
    return {
        money: Math.round(impacts.money * multiplier.money),
        stress: Math.round(impacts.stress * multiplier.stress),
        businessGrowth: Math.round(impacts.businessGrowth * multiplier.growth)
    };
}

// ============ SOUND SYSTEM ============
function playSound(soundType) {
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (!soundEnabled) return;
    
    // Use Web Audio API for simple sound effects
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        switch(soundType) {
            case 'click':
                const osc1 = audioContext.createOscillator();
                const gain1 = audioContext.createGain();
                osc1.connect(gain1);
                gain1.connect(audioContext.destination);
                osc1.frequency.value = 400;
                gain1.gain.setValueAtTime(0.1, now);
                gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc1.start(now);
                osc1.stop(now + 0.1);
                break;
            case 'success':
                for (let i = 0; i < 3; i++) {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = 500 + (i * 150);
                    gain.gain.setValueAtTime(0.1, now + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.15);
                }
                break;
            case 'error':
                const oscErr = audioContext.createOscillator();
                const gainErr = audioContext.createGain();
                oscErr.connect(gainErr);
                gainErr.connect(audioContext.destination);
                oscErr.frequency.value = 200;
                gainErr.gain.setValueAtTime(0.1, now);
                gainErr.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                oscErr.start(now);
                oscErr.stop(now + 0.2);
                break;
        }
    } catch (e) {
        console.log('Sound not available');
    }
}

// ============ AUTOSAVE SYSTEM ============
function initializeAutosave() {
    const autosave = localStorage.getItem('autosave') || 'on';
    if (autosave === 'on') {
        // Auto-save every 30 seconds
        setInterval(() => {
            saveGameProgress();
        }, 30000);
    }
}

function saveGameProgress() {
    localStorage.setItem('money', gameState.money);
    localStorage.setItem('stress', gameState.stress);
    localStorage.setItem('growth', gameState.businessGrowth);
    localStorage.setItem('currentDay', gameState.day);
    console.log('Game auto-saved');
}

// ============ LOAD SAVED PROGRESS ============
function loadSavedProgress() {
    const savedMoney = parseInt(localStorage.getItem('money')) || 150000;
    const savedStress = parseInt(localStorage.getItem('stress')) || 30;
    const savedGrowth = parseInt(localStorage.getItem('growth')) || 20;
    const savedDay = parseInt(localStorage.getItem('currentDay')) || 1;
    
    return {
        money: savedMoney,
        stress: savedStress,
        businessGrowth: savedGrowth,
        day: savedDay
    };
}

// ============ GAME STATE ============
const savedProgress = loadSavedProgress();
let gameState = {
    day: savedProgress.day,
    money: savedProgress.money,
    stress: savedProgress.stress,
    businessGrowth: savedProgress.businessGrowth,
    phase: 'playing',
    scenarioIndex: -1,
    selectedChoice: null,
    oldMoney: savedProgress.money,
    oldStress: savedProgress.stress,
    oldBusinessGrowth: savedProgress.businessGrowth,
    userId: localStorage.getItem('userId'),
    firstName: localStorage.getItem('firstName'),
    fieldOfStudy: localStorage.getItem('fieldOfStudy'),
};

// ============ SCENARIOS DATA ============
const SCENARIOS = [
    // WORK SCENARIOS (10)
    {
        title: 'Generator Breakdown',
        category: 'Work',
        description: 'Your generator just died. The technician wants ₦25,000 to repair it. Without power, you can\'t work for 2 days. What do you do?',
        choices: [
            {
                text: 'Pay the technician immediately',
                impacts: { money: -25000, stress: -15, businessGrowth: 10 },
                tutorComment: 'Ayo! You manage am well. Quick decision no go make small small problem become big trouble. That\'s how successful agberos think.'
            },
            {
                text: 'Try to fix it yourself (risky)',
                impacts: { money: -5000, stress: 20, businessGrowth: 0 },
                tutorComment: 'Ehhh, you do YouTube engineering 🙄 Your back pain don\'t carry you oh. Sometimes spend small to save large broda/sista.'
            },
            {
                text: 'Borrow money from a friend',
                impacts: { money: 10000, stress: 25, businessGrowth: -10 },
                tutorComment: 'Oga/Madam, when you borrow, people own your business. That debt go haunt you like bad juju.'
            }
        ]
    },
    {
        title: 'Big Client Wants Discount',
        category: 'Work',
        description: 'Your best client (₦50,000 deal) says they\'ll only buy if you drop price to ₦35,000. Do you agree?',
        choices: [
            {
                text: 'Accept the discount',
                impacts: { money: 35000, stress: -10, businessGrowth: 15 },
                tutorComment: 'A bird in hand, bro! Sometimes profit smaller than zero profit. You kept the customer, that\'s winning for now.'
            },
            {
                text: 'Refuse and lose them',
                impacts: { money: 0, stress: 5, businessGrowth: -5 },
                tutorComment: 'Pride get better of you! In this Nigeria, hunger go teach person sense. You no be Dangote yet na.'
            },
            {
                text: 'Negotiate to ₦42,000',
                impacts: { money: 42000, stress: -5, businessGrowth: 8 },
                tutorComment: 'Smart move! You split the difference. This is how Abuja people do business. Half bread better than nothing.'
            }
        ]
    },
    {
        title: 'Supplier Delayed Payment',
        category: 'Work',
        description: 'Your supplier won\'t deliver goods unless you pay upfront (₦40,000). You don\'t have goods, no sales can happen.',
        choices: [
            {
                text: 'Scrape money together and pay',
                impacts: { money: -40000, stress: 0, businessGrowth: 20 },
                tutorComment: 'Business is about trust and flow, my friend. You pay, goods come, money comes back. That\'s the cycle.'
            },
            {
                text: 'Find a different supplier',
                impacts: { money: -5000, stress: 10, businessGrowth: 5 },
                tutorComment: 'Options! That\'s power baby. But e go take time find new supplier. Quick solution is sometimes the best solution.'
            },
            {
                text: 'Try to get goods on credit',
                impacts: { money: 0, stress: 20, businessGrowth: -10 },
                tutorComment: 'Nobody get free lunch in Abuja my G. If supplier no trust you, wetin make customer trust you? Debt don\'t disappear na.'
            }
        ]
    },
    {
        title: 'Employee Called Sick',
        category: 'Work',
        description: 'Your only employee is sick and can\'t work for a week. You have a big order that needs completing. Handle?',
        choices: [
            {
                text: 'Do the work yourself (tire yourself)',
                impacts: { money: 40000, stress: 30, businessGrowth: 10 },
                tutorComment: 'Eish! Your body is not a machine broda/sista. You go finish the work but your health go start issue for you sha.'
            },
            {
                text: 'Delay the order and apologize',
                impacts: { money: 0, stress: 15, businessGrowth: -15 },
                tutorComment: 'When you lose customer trust, money follow behind am. One delayed order can finish good reputation oyinbo-style.'
            },
            {
                text: 'Hire a temporary worker',
                impacts: { money: 20000, stress: 5, businessGrowth: 10 },
                tutorComment: 'Smart thinking! That\'s delegation my G. No man is island. Even Dangote get people working for am.'
            }
        ]
    },
    {
        title: 'Customer Wants Refund',
        category: 'Work',
        description: 'A customer says your product is faulty and wants full refund (₦30,000). You know it\'s user error not fault.',
        choices: [
            {
                text: 'Give the refund (keep reputation)',
                impacts: { money: -30000, stress: -20, businessGrowth: 5 },
                tutorComment: 'You lose ₦30k but you win peace of mind. Bad reputation cost more than that ₦30k I promise you.'
            },
            {
                text: 'Refuse refund (keep money)',
                impacts: { money: 30000, stress: 20, businessGrowth: -20 },
                tutorComment: 'Oga, you win this round but you go lose long term. Word-of-mouth in Naija is very strong medicine.'
            },
            {
                text: 'Offer replacement instead',
                impacts: { money: -2000, stress: 0, businessGrowth: 10 },
                tutorComment: 'Compromise is the master key! You save face, you keep customer, you only lose small change. That\'s business wisdom.'
            }
        ]
    },
    {
        title: 'New Competitor Entered Market',
        category: 'Work',
        description: 'A big player just started selling same product cheaper. Your customers are asking why yours is expensive.',
        choices: [
            {
                text: 'Drop your prices to compete',
                impacts: { money: -20000, stress: 10, businessGrowth: 5 },
                tutorComment: 'Price war don\'t end well for anybody bro. You go break bone, he go break bone, market learn nothing.'
            },
            {
                text: 'Improve quality and brand',
                impacts: { money: -15000, stress: -10, businessGrowth: 25 },
                tutorComment: 'VISION! You no think short. In five years, people go remember your name, not the price-cutter. Invest in yourself.'
            },
            {
                text: 'Ignore them and keep same price',
                impacts: { money: -20000, stress: 5, businessGrowth: -15 },
                tutorComment: 'Market changed o, you standing still! You go wake up one day, all your customers don enter the other guy shop.'
            }
        ]
    },
    {
        title: 'VIP Client Needs Negotiation',
        category: 'Work',
        description: 'A very important person (government contractor) wants to work with you but needs special payment terms: work first, pay later.',
        choices: [
            {
                text: 'Accept the terms (big risk)',
                impacts: { money: -50000, stress: 25, businessGrowth: 30 },
                tutorComment: 'Big risk, big reward! If he pay, you set for life. If he no pay... eish. Calculated gamble like this is what separates boys from men.'
            },
            {
                text: 'Demand 50% upfront',
                impacts: { money: 25000, stress: -5, businessGrowth: 15 },
                tutorComment: 'That\'s business sense right there! You take something, you give something. Balance of power, that\'s what it called.'
            },
            {
                text: 'Politely decline the offer',
                impacts: { money: 0, stress: -10, businessGrowth: 0 },
                tutorComment: 'Rest easy! No contract better than bad contract. If he serious, he go come back with proper terms. Time will tell.'
            }
        ]
    },
    {
        title: 'Supplier Delayed Delivery',
        category: 'Work',
        description: 'Your supplier promised goods last week. You already told customers goods coming. They\'re getting angry. ₦60k in orders at risk.',
        choices: [
            {
                text: 'Pressure supplier hard, offer bonus to rush',
                impacts: { money: -10000, stress: 10, businessGrowth: 15 },
                tutorComment: 'Ebo! You oil the wheel, the wheel must turn fast. Small money to make big money come - that\'s how commerce works.'
            },
            {
                text: 'Apologize to customers, offer refunds',
                impacts: { money: -60000, stress: 20, businessGrowth: -20 },
                tutorComment: 'Ayah! You destroy your own business with your hands. Customer rage is fire - if you no quench am, it burn everything.'
            },
            {
                text: 'Find backup supplier and fulfill orders',
                impacts: { money: -15000, stress: 5, businessGrowth: 20 },
                tutorComment: 'Smart backup plan! You save the day. This is how professionals handle pressure without panicking.'
            }
        ]
    },
    {
        title: 'Request for Business Credit',
        category: 'Work',
        description: 'A customer wants to buy ₦80,000 worth of goods but requests credit for 3 months. He\'s reliable but you need cash flow.',
        choices: [
            {
                text: 'Give him the credit',
                impacts: { money: -40000, stress: 15, businessGrowth: 20 },
                tutorComment: 'You trust am, he trust you. That\'s how empire start - relationships. But enh, make sure 3 months na 3 months o.'
            },
            {
                text: 'Demand 50% prepayment',
                impacts: { money: 40000, stress: -5, businessGrowth: 15 },
                tutorComment: 'Business is business, friend is friend. Fifty-fifty arrange am correct - that\'s the Abuja way now.'
            },
            {
                text: 'Politely say no credit available',
                impacts: { money: 0, stress: 5, businessGrowth: 0 },
                tutorComment: 'You no break your spine for anybody. Cash is king, respect that principle. Customers no wey if they no get am.'
            }
        ]
    },
    {
        title: 'Bulk Order But Very Tight Deadline',
        category: 'Work',
        description: 'Someone wants to buy ₦120,000 worth (2x your normal order) but needs it in 3 days. It\'s tight but doable. Your stress will spike.',
        choices: [
            {
                text: 'Accept the bulk order, push hard',
                impacts: { money: 120000, stress: 35, businessGrowth: 25 },
                tutorComment: 'Money talk! Yes, stress go do you pepper, but hundred thousand naira is not small change my broda/sista. The muscle pain will pass.'
            },
            {
                text: 'Take partial order (less stress)',
                impacts: { money: 60000, stress: 15, businessGrowth: 10 },
                tutorComment: 'Smart half\' decision! You scale am down. This one better than dying from stress before the money reach your account.'
            },
            {
                text: 'Decline to protect your peace',
                impacts: { money: 0, stress: -15, businessGrowth: 5 },
                tutorComment: 'Health is wealth broda! No amount of money worth your life. When you healthy and rested, better opportunities come naturally.'
            }
        ]
    },
    // LIFE SCENARIOS (10)
    {
        title: 'School Fees Demand',
        category: 'Life',
        description: 'Your child\'s school is demanding ₦45,000 fees immediately or they\'ll be sent home. Budget is tight.',
        choices: [
            {
                text: 'Pay immediately from business',
                impacts: { money: -45000, stress: -10, businessGrowth: 0 },
                tutorComment: 'Your child education must not suffer because of business trouble. That investment go come back to you many times over.'
            },
            {
                text: 'Borrow from family friend',
                impacts: { money: 0, stress: 10, businessGrowth: 0 },
                tutorComment: 'Na family sef, but the debt hanging over your head go make you do things you no proud of. Tread careful.'
            },
            {
                text: 'Negotiate payment plan with school',
                impacts: { money: -15000, stress: -5, businessGrowth: 0 },
                tutorComment: 'Good strategy! You pay what you can, keep your child in school. Many schools too understand the economy now.'
            }
        ]
    },
    {
        title: 'You Got Malaria',
        category: 'Life',
        description: 'Fever set in, your whole body hurting. You need ₦8,000 for hospital AND have to miss work for 3 days.',
        choices: [
            {
                text: 'Go to hospital immediately',
                impacts: { money: -8000, stress: -20, businessGrowth: -5 },
                tutorComment: 'Sickness plus denial equal death! Go treat yourself proper. When you come back strong, work go wait for you.'
            },
            {
                text: 'Try self-medication at home',
                impacts: { money: -1000, stress: 15, businessGrowth: -15 },
                tutorComment: 'Oga, Nigeria condition no mean we must die. Go see proper doctor! This one no go end well the way you planning.'
            },
            {
                text: 'Work through it (dangerous)',
                impacts: { money: 30000, stress: 40, businessGrowth: -10 },
                tutorComment: 'Your head no correct! You go die work finish, then what? Who go manage your business after you enter coffin?'
            }
        ]
    },
    {
        title: 'Landlord Demands Extra Money',
        category: 'Life',
        description: 'Landlord just told you rent go increase by ₦20,000 per year. Says "economy don\'t reason with anybody." Your shop rent.',
        choices: [
            {
                text: 'Accept and adjust business price',
                impacts: { money: -20000, stress: 5, businessGrowth: 0 },
                tutorComment: 'You accept reality and move. That\'s the game in Nigeria. Landlord own the land, you just renting the space.'
            },
            {
                text: 'Argue and refuse to pay',
                impacts: { money: 0, stress: 30, businessGrowth: -10 },
                tutorComment: 'Oya, enjoy your stubborn mind in the street! Landlord go lock shop faster than you think say "I no pay."'
            },
            {
                text: 'Find cheaper location elsewhere',
                impacts: { money: -15000, stress: 10, businessGrowth: 5 },
                tutorComment: 'Smart escape! Lower rent means more breathing space for business. Moving pain temporary, relief permanent.'
            }
        ]
    },
    {
        title: 'Brother Asking for Loan',
        category: 'Life',
        description: 'Your brother lost his job and is asking to borrow ₦40,000 to feed his family. You know he struggles with money management.',
        choices: [
            {
                text: 'Give him the loan',
                impacts: { money: -40000, stress: 20, businessGrowth: 0 },
                tutorComment: 'Blood is blood, that one no dispute. But make sure you ready to lose that money - because brothers and loans don\'t mix well.'
            },
            {
                text: 'Give him half as gift, not loan',
                impacts: { money: -20000, stress: -5, businessGrowth: 0 },
                tutorComment: 'Wisdom! You help the family, you don\'t create future problem. Gift better than loan when you no sure-sure he go repay.'
            },
            {
                text: 'Refuse and tell him to hustle',
                impacts: { money: 0, stress: 25, businessGrowth: 0 },
                tutorComment: 'Oga, family pain worse than business pain! This decision go hunt you till you dead. Some things harder to recover than money.'
            }
        ]
    },
    {
        title: 'Wife Wants Her Own Business',
        category: 'Life',
        description: 'Your wife wants ₦50,000 to start a fashion side business. Good idea but you were saving that money for shop expansion.',
        choices: [
            {
                text: 'Support her business dream',
                impacts: { money: -50000, stress: -15, businessGrowth: 10 },
                tutorComment: 'Two incomes better than one! If she succeed, your family income double. That\'s multiplication, not division.'
            },
            {
                text: 'Tell her to wait till business is bigger',
                impacts: { money: 0, stress: 10, businessGrowth: 15 },
                tutorComment: 'Time will come, but now na expansion time. Marriage is partnership - sometimes you lead, sometimes she lead.'
            },
            {
                text: 'Invest in business expansion instead',
                impacts: { money: -50000, stress: 5, businessGrowth: 30 },
                tutorComment: 'You focus on what you know. More business growth mean more money - then she can definitely start her own thing later.'
            }
        ]
    },
    {
        title: 'Mother Hospitalized Emergency',
        category: 'Life',
        description: 'Your mother had stroke. Hospital wants ₦80,000 for treatment before they proceed. You have ₦100,000 in savings.',
        choices: [
            {
                text: 'Pay for treatment immediately',
                impacts: { money: -80000, stress: -30, businessGrowth: 0 },
                tutorComment: 'Your mother gave you life! No amount of money more important than her health. This no even debate na.'
            },
            {
                text: 'Negotiate with doctor for payment plan',
                impacts: { money: -30000, stress: -10, businessGrowth: 0 },
                tutorComment: 'Smart thinking! You save your mother AND save money. Most doctors in Nigeria understand hardship - appeal to their humanity.'
            },
            {
                text: 'Ask hospital to wait till you make money',
                impacts: { money: 0, stress: 50, businessGrowth: -20 },
                tutorComment: 'Oga, this one go finish you emotionally! Time critical in medical situation. No hospital go wait "till you make money."'
            }
        ]
    },
    {
        title: 'Uncle Needs Respect Gift',
        category: 'Life',
        description: 'Your uncle is visiting from the village. Your culture says you must give him money as respect. He\'s expecting ₦30,000 minimum.',
        choices: [
            {
                text: 'Give ₦30,000 respect gift',
                impacts: { money: -30000, stress: -10, businessGrowth: 0 },
                tutorComment: 'Culture is investment in peace of mind! Uncle go bless your business, go recommend you to his connections. Money na circular thing.'
            },
            {
                text: 'Give ₦10,000 and explain situation',
                impacts: { money: -10000, stress: 5, businessGrowth: 0 },
                tutorComment: 'You respect with what you have! If uncle get sense, he go understand. If he no get sense, that\'s his own problem na.'
            },
            {
                text: 'Avoid uncle till he leaves',
                impacts: { money: 0, stress: 30, businessGrowth: -10 },
                tutorComment: 'Ehhh! You create family problem worse than money! One day you go need that uncle\'s help, you go remember this disrespect.'
            }
        ]
    },
    {
        title: 'Wife Wants Vacation',
        category: 'Life',
        description: 'Your wife says she\'s tired and needs a vacation. ₦35,000 for family trip. Business is doing okay but not great.',
        choices: [
            {
                text: 'Book the vacation (invest in peace)',
                impacts: { money: -35000, stress: -20, businessGrowth: 0 },
                tutorComment: 'Happy wife, happy life! Your wife go come back refreshed, you go have energy to face business. This investment pay interest in peace.'
            },
            {
                text: 'Suggest local trip instead (cheaper)',
                impacts: { money: -10000, stress: -5, businessGrowth: 5 },
                tutorComment: 'Compromise! You still give family time, you save money too. Not everything must be big-big arrangement to be meaningful.'
            },
            {
                text: 'Refuse - money must stay in business',
                impacts: { money: 0, stress: 20, businessGrowth: 10 },
                tutorComment: 'Oga, your family go think you marry business over them! Yes expand money, but no lose family in process. That one no worth it.'
            }
        ]
    },
    {
        title: 'Parent\'s Health Insurance Crisis',
        category: 'Life',
        description: 'Your parent\'s chronic illness is costing ₦25,000 monthly on medication. You didn\'t budget for this. What now?',
        choices: [
            {
                text: 'Pay from business, adjust expenses',
                impacts: { money: -25000, stress: -5, businessGrowth: -10 },
                tutorComment: 'Your responsibility taking form! Parent health expensive but necessary. What you save on business can be recovered, you no recover dead parent.'
            },
            {
                text: 'Get parent on government health scheme',
                impacts: { money: -2000, stress: 0, businessGrowth: 0 },
                tutorComment: 'GENIUS! Government NHIS exist for situations like this. Process slow but at least cover something. Combine with medication assist.'
            },
            {
                text: 'Tell parent to manage with cheaper meds',
                impacts: { money: 0, stress: 25, businessGrowth: 0 },
                tutorComment: 'Nah man, that one no even kind. When parent die from bad medicine, your business profit no go bring am back na.'
            }
        ]
    },
    {
        title: 'Sibling Getting Married',
        category: 'Life',
        description: 'Your sibling is getting married and you\'re expected as big one to contribute ₦50,000 to the wedding expenses. Family shame if you no show up.',
        choices: [
            {
                text: 'Contribute the ₦50,000 fully',
                impacts: { money: -50000, stress: -20, businessGrowth: 0 },
                tutorComment: 'Family duty! Your sibling remember how you show up for them. In future when you need help, the whole family go rush to you.'
            },
            {
                text: 'Contribute ₦25,000 and explain hardship',
                impacts: { money: -25000, stress: 0, businessGrowth: 0 },
                tutorComment: 'That one honest approach. You show love, you show effort, but you no break yourself. Family should understand business hardship.'
            },
            {
                text: 'Give very small gift and stay low-key',
                impacts: { money: -5000, stress: 15, businessGrowth: 0 },
                tutorComment: 'Ehhh, better you come than no come! Family go talk but they understand the economic time. Small contribution still show up for family.'
            }
        ]
    },
    // SYSTEM SCENARIOS (10)
    {
        title: 'Fuel Price Hike',
        category: 'System',
        description: 'Government just removed subsidy. Fuel price jumped from ₦200 to ₦650 per liter. Your operational costs just jumped 30%.',
        choices: [
            {
                text: 'Adjust by raising your prices',
                impacts: { money: 10000, stress: 5, businessGrowth: 5 },
                tutorComment: 'Business arithmetic is simple - cost go up, price go up. Your customer understand economics too, no vex anyone.'
            },
            {
                text: 'Reduce fuel usage (cut deliveries)',
                impacts: { money: -30000, stress: 10, businessGrowth: -10 },
                tutorComment: 'You save fuel, you lose sales. That trade no good broda. Price adjustment better than service reduction.'
            },
            {
                text: 'Absorb cost and reduce profit',
                impacts: { money: -40000, stress: 15, businessGrowth: 0 },
                tutorComment: 'Na wa for you o! Why you no go out and hang yourself? Other business raise price, why you want to martyr yourself?'
            }
        ]
    },
    {
        title: 'Federal Tax Audit',
        category: 'System',
        description: 'FIRS shows up at your business. They want tax payment from last year: ₦35,000. They say it\'s mandatory.',
        choices: [
            {
                text: 'Pay the tax properly',
                impacts: { money: -35000, stress: 10, businessGrowth: 0 },
                tutorComment: 'Blood of the covenant! You pay government, government no go disturb you again. Small price for big peace of mind.'
            },
            {
                text: 'Negotiate payment plan',
                impacts: { money: -12000, stress: 5, businessGrowth: 0 },
                tutorComment: 'They go accept payment plan! Government sef need money, not your whole wallet. Three installments work better than emergency.'
            },
            {
                text: 'Refuse and argue you no owe',
                impacts: { money: -60000, stress: 40, businessGrowth: -20 },
                tutorComment: 'Nah, FIRS no joke! They go seize your whole shop, lock am up, sell your goods. Then you pay ₦35k PLUS whole shop loss. Bad idea.'
            }
        ]
    },
    {
        title: 'Heavy Rain Flooded Market',
        category: 'System',
        description: 'Unexpected heavy rain flooded the entire market. Your shop got water damage. Stock worth ₦60,000 damaged. You have ₦45,000 insurance coverage.',
        choices: [
            {
                text: 'Use insurance, rebuy stock',
                impacts: { money: -15000, stress: -10, businessGrowth: 0 },
                tutorComment: 'Thank God for insurance! This reason why some of us buy am. You protected, you move forward. Life still continue.'
            },
            {
                text: 'Skip rebuy, save money for now',
                impacts: { money: 45000, stress: 15, businessGrowth: -20 },
                tutorComment: 'Oga, no shop no business! You go come back with half-stock just when competitor showing up better? Think again.'
            },
            {
                text: 'Borrow money to fully restock',
                impacts: { money: -30000, stress: 25, businessGrowth: 10 },
                tutorComment: 'Quick recovery plan but the debt go choke am! Use this only if you 100% sure you fit repay within one month max.'
            }
        ]
    },
    {
        title: 'Power Outage for One Week',
        category: 'System',
        description: 'NEPA maintenance says power will be out for 7 days. Your business depend on power (fridge, lights, power tools).',
        choices: [
            {
                text: 'Rent a generator for the week',
                impacts: { money: -18000, stress: -10, businessGrowth: 5 },
                tutorComment: 'Cost of doing business in Nigeria broda! Generator no cheap but it keep your business running. You no fit compete in darkness.'
            },
            {
                text: 'Close shop for the week',
                impacts: { money: -40000, stress: 15, businessGrowth: -15 },
                tutorComment: 'You lose one whole week of sales! That loss go be bigger than generator cost, I promise you. Lose customers too when you disappear.'
            },
            {
                text: 'Work manually (no generator)',
                impacts: { money: 0, stress: 20, businessGrowth: -10 },
                tutorComment: 'Nigeria creativity! But customers no go give trophy for "manually operated." They go go to your competition with gen and light.'
            }
        ]
    },
    {
        title: 'Armed Robber Stopped You',
        category: 'System',
        description: 'You were robbed on the way home with ₦55,000 cash meant for next-day supply restocking. Robber took everything.',
        choices: [
            {
                text: 'Report to police and get loan',
                impacts: { money: -3000, stress: 20, businessGrowth: -10 },
                tutorComment: 'Report am! At least make record. Then beg supplier give credit or get small loan. Bad thing happened but life continue.'
            },
            {
                text: 'Don\'t report (avoid police hassle)',
                impacts: { money: -55000, stress: 30, businessGrowth: -15 },
                tutorComment: 'Na your own loss that one! You no report, business no progress. That money gone just like that. E painful nut that\'s business life.'
            },
            {
                text: 'Sell items at discount to raise cash quick',
                impacts: { money: -20000, stress: 15, businessGrowth: 0 },
                tutorComment: 'Fire sale strategy! You bounce back quick. Discount hurt but continuity better than shutdown. Bird in hand still better than two in bush.'
            }
        ]
    },
    {
        title: 'FIRS Demanding Extra License Fee',
        category: 'System',
        description: 'Government just introduced new business license fee of ₦22,000. Saying all businesses must pay by next week or get fined.',
        choices: [
            {
                text: 'Pay the license fee on time',
                impacts: { money: -22000, stress: 5, businessGrowth: 0 },
                tutorComment: 'Government go government o! You pay, you sleep well. No penalty, no fine, no stress. ₦22k to keep ₦150k peace? Easy decision.'
            },
            {
                text: 'Pay but visit government and ask why',
                impacts: { money: -22000, stress: -5, businessGrowth: 5 },
                tutorComment: 'You pay AND you get involved politically! This how successful people influence policy. Seat at table matter more than shouting from corner.'
            },
            {
                text: 'Refuse and hide business',
                impacts: { money: 0, stress: 35, businessGrowth: -25 },
                tutorComment: 'Running business in hiding! That go handicap you bad. No official license mean no bank account, no contracts, no growth. Stupid idea.'
            }
        ]
    },
    {
        title: 'Water Scarcity in Area',
        category: 'System',
        description: 'Your area water has finished. No water for business operations (cleaning, production, selling). Crisis might last 3 weeks.',
        choices: [
            {
                text: 'Buy water from supplier daily',
                impacts: { money: -15000, stress: 10, businessGrowth: 0 },
                tutorComment: 'Cost of business in Nigeria brother! Water vendor go supply you. E expensive but that part of operating here. No be your first crisis.'
            },
            {
                text: 'Store water in advance (if you can)',
                impacts: { money: -5000, stress: -5, businessGrowth: 5 },
                tutorComment: 'Preparation is key! You smart. Small investment in water tank today save bigger money later. This is long-term thinking.'
            },
            {
                text: 'Reduce operations, wait out the crisis',
                impacts: { money: -30000, stress: 15, businessGrowth: -10 },
                tutorComment: 'You pause your business hoping government fix water? Bros, government no fast like that! You go lose opportunity and customers.'
            }
        ]
    },
    {
        title: 'Permit Renewal Demand',
        category: 'System',
        description: 'Local government is demanding permit renewal of ₦25,000. Old permit expire. No permit = no business legally.',
        choices: [
            {
                text: 'Renew permit on time',
                impacts: { money: -25000, stress: 5, businessGrowth: 0 },
                tutorComment: 'Rules of the game! You renew, you stay in business. Late renewal mean shut down, fines, bigger problem. Bite the bullet and pay.'
            },
            {
                text: 'Delay renewal and "manage"',
                impacts: { money: 0, stress: 20, businessGrowth: -10 },
                tutorComment: 'Managing with government sef go cost more than ₦25k somehow! Fine, bribe, shutdown - it all add up. Pay proper better.'
            },
            {
                text: 'Pay but demand accountability',
                impacts: { money: -25000, stress: -5, businessGrowth: 10 },
                tutorComment: 'Pay AND ask what they doing with money! This how you participate in system. Not everything must be silent suffering na!'
            }
        ]
    },
    {
        title: 'Internet Goes Down (3 Days)',
        category: 'System',
        description: 'Your internet provider gone. 3 days with no online orders, communication, or backup systems. Estimated loss: ₦40,000.',
        choices: [
            {
                text: 'Switch provider and pay reconnection',
                impacts: { money: -8000, stress: 10, businessGrowth: 5 },
                tutorComment: 'One provider no reliable? Get backup! Multiple internet sources = multiple incomes. Smart business ha redundancy.'
            },
            {
                text: 'Wait for provider to fix (lose money)',
                impacts: { money: -40000, stress: 20, businessGrowth: -10 },
                tutorComment: 'You dependent like baby on mother\'s breast! One thing break, whole business brake. This why diversification matter.'
            },
            {
                text: 'Use mobile hotspot as temporary solution',
                impacts: { money: -2000, stress: -5, businessGrowth: 0 },
                tutorComment: 'Quick thinking! You no shut down, you keep operations going. This temporary till the big internet come back. Smart adjustment.'
            }
        ]
    },
    {
        title: 'Curfew Imposed Suddenly',
        category: 'System',
        description: 'Government just announced curfew 6pm to 6am for 2 weeks. Your business hours cut in half. You operate in evening.',
        choices: [
            {
                text: 'Pivot to daytime operations',
                impacts: { money: 20000, stress: 15, businessGrowth: 10 },
                tutorComment: 'Adapt or die! You move your business completely to daytime. Risky but you keep earning. Evolution of business strategy right there.'
            },
            {
                text: 'Close shop during curfew (lose money)',
                impacts: { money: -50000, stress: 10, businessGrowth: 0 },
                tutorComment: 'Two weeks lose completely! That revenue go stay gone. Government policy na not your problem, your hustle na the solution.'
            },
            {
                text: 'Modify shop to serve before curfew',
                impacts: { money: 30000, stress: 5, businessGrowth: 15 },
                tutorComment: 'Smart nigerian problem-solving! You still serve before curfew time. People go anticipate, come early, you capture market. Nice thinking.'
            }
        ]
    }
];

// ============ HELPER FUNCTIONS ============
function generateNaijaComment() {
    const money = gameState.money;
    const stress = gameState.stress;
    const growth = gameState.businessGrowth;

    const comments = [
        'That move na small-small! Keep pushing.',
        'Abuja people no sleep, you too stay awake!',
        'The way you thinking, you go make am one day I swear.',
        'Ehhh, bodies don\'t work themselves! Rest when you can.',
        'That decision smell like Naija wisdom, that one.',
        'Your coffers getting better, oya keep the vibe.',
        'Hunger going teach you what money no teach! Push!',
        'That stress level sef, sit down and find your peace small.',
        'Growth don start to show face! You on track for real.',
        'Money tight eh? No worry, tomorrow is another day.',
        'That business strategy sound like Dangote was your teacher!',
        'Na God go bless this labour oh, I see it!',
        'You dey kampe well well! Keep body strong.',
        'If you continue like this, your name go dey mouth in Abuja.',
        'That hustle spirit, your grandchildren go hear am.',
        'Una big for here! Keep the momentum going.',
        'Stress no be small thing o, balance your life well.',
        'The way your business going, competitors go wake up sharp!',
        'That wisdom go carry you far, believe me.',
        'Every small decision matter, you learn am well done.',
        'Eish! Your stress high like NEPA bill. Breathe abeg.',
        'This one look like the beginning of bigger things!',
        'That your decision just open new door somehow.',
        'Body strong, mind sharp, money in hand - that\'s success.',
        'The hustle real but remember, health na number one priority.',
        'Money dey come, stress dey follow - that\'s the game.',
        'Your business growing like weeds in rainy season!',
        'Respect yourself first, then others go respect you.',
        'That boldness na why you go win in the end.',
        'Keep one eye on money, keep one eye on your health.'
    ];

    return comments[Math.floor(Math.random() * comments.length)];
}

function getPersonalityTitle() {
    const m = gameState.money;
    const s = gameState.stress;
    const g = gameState.businessGrowth;

    if (m > 200000 && s < 40) {
        return { title: 'The Abuja Big Boy/Girl', emoji: '👑', message: 'You made serious money AND stayed cool about it. That\'s elite level right there. Dangote who? 😎' };
    }
    if (m > 200000 && s >= 40) {
        return { title: 'The Rich Workaholic', emoji: '💪', message: 'Money chase you harder than you chase money! Rest sometimes brother/sister, health no dey for mall.' };
    }
    if (m <= 150000 && m > 100000 && s < 40) {
        return { title: 'The Chilled Struggler', emoji: '😎', message: 'You no get heavy money but your peace intact. That\'s wisdom! Millions dey worry themselves to grave.' };
    }
    if (m <= 100000 && s >= 50) {
        return { title: 'The Desperate Hustler', emoji: '🔥', message: 'Broke AND tired? That\'s Nigeria for you. But you still here fighting - that resilience na superpower.' };
    }
    if (g > 70) {
        return { title: 'The Growth Machine', emoji: '📈', message: 'Your business expanding like it get wings! People go remember your name in 5 years, guaranteed.' };
    }
    if (m > 180000 && g < 30) {
        return { title: 'The Safe Keeper', emoji: '🏦', message: 'Beautiful money, but no risk mean no growth. That money sitting too comfortable, make am work harder!' };
    }
    return { title: 'The Balanced Entrepreneur', emoji: '⚖️', message: 'You doing okay-okay! Between money, stress, and growth - you holding am together like pro. Nice one!' };
}

function getRandomScenario() {
    const newIndex = Math.floor(Math.random() * SCENARIOS.length);
    gameState.scenarioIndex = newIndex;
    return SCENARIOS[newIndex];
}

function checkGameOver() {
    if (gameState.money <= 0) {
        return 'You\'re broke! This happens to the best of us in Nigeria. Business no money = business dead.';
    }
    if (gameState.stress >= 100) {
        return 'Your stress maxed out! Your body force-locked you from business. Rest calls, body answer.';
    }
    return null;
}

// ============ DOM RENDERS ============
function render() {
    if (gameState.phase === 'finished') {
        renderFinishScreen();
    } else if (gameState.phase === 'gameOver') {
        renderGameOverScreen();
    } else if (gameState.phase === 'consequence') {
        renderConsequence();
    } else if (gameState.phase === 'dailySummary') {
        renderDailySummary();
    } else {
        renderGameplay();
    }
}

function renderHeader() {
    const headerHTML = `
        <div class="header-content">
            <div class="header-left">
                <h1>JobSim Nigeria</h1>
                <div class="user-info">Welcome, ${gameState.firstName || 'Player'}! | ${gameState.fieldOfStudy || 'Field Unknown'}</div>
            </div>
            <div class="header-stats">
                Day <span>${gameState.day}/30</span> | 
                Money NGN<span>${gameState.money.toLocaleString()}</span> | 
                Stress <span>${gameState.stress}%</span> | 
                Growth <span>${gameState.businessGrowth}</span>
            </div>
            <button class="nav-menu-toggle" id="navMenuToggle" onclick="toggleNavMenu()">Menu</button>
            <div class="header-nav" id="headerNav">
                <button class="nav-btn" onclick="window.location.href='profile.html'" title="View Profile">Profile</button>
                <button class="nav-btn" onclick="window.location.href='leaderboard.html'" title="Leaderboard">Rankings</button>
                <button class="nav-btn" onclick="window.location.href='achievements.html'" title="Achievements">Awards</button>
                <button class="nav-btn" onclick="window.location.href='settings.html'" title="Settings">Settings</button>
                <button class="nav-btn" onclick="window.location.href='tutorial.html'" title="Tutorial">Guide</button>
                <button class="logout-btn" onclick="logoutUser()">Logout</button>
            </div>
        </div>
    `;
    document.querySelector('.header').innerHTML = headerHTML;
}

function toggleNavMenu() {
    const navMenu = document.getElementById('headerNav');
    if (navMenu) {
        navMenu.classList.toggle('active');
    }
}

// ============ AUTHENTICATION FUNCTIONS ============
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all user data from localStorage
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('firstName');
        localStorage.removeItem('fieldOfStudy');
        
        // Redirect to landing page after logout
        playSound('click');
        window.location.href = 'landing.html';
    }
}

function renderStatBars() {
    const moneyPercent = Math.min(Math.max(gameState.money / 200000, 0), 1) * 100;
    const stressPercent = Math.min(Math.max(gameState.stress / 100, 0), 1) * 100;
    const growthPercent = Math.min(Math.max(gameState.businessGrowth / 100, 0), 1) * 100;

    return `
        <div class="stat-bar">
            <div class="stat-bar-label">
                <span>💰 Money</span>
                <span>₦${gameState.money.toLocaleString()}</span>
            </div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill green" style="width: ${moneyPercent}%"></div>
            </div>
        </div>
        <div class="stat-bar">
            <div class="stat-bar-label">
                <span>😤 Stress</span>
                <span>${gameState.stress}/100</span>
            </div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill red" style="width: ${stressPercent}%"></div>
            </div>
        </div>
        <div class="stat-bar">
            <div class="stat-bar-label">
                <span>📈 Business Growth</span>
                <span>${gameState.businessGrowth}/100</span>
            </div>
            <div class="stat-bar-track">
                <div class="stat-bar-fill blue" style="width: ${growthPercent}%"></div>
            </div>
        </div>
    `;
}

function renderGameplay() {
    renderHeader();
    const scenario = SCENARIOS[gameState.scenarioIndex];

    if (!scenario) {
        // First time - get first scenario
        getRandomScenario();
        render();
        return;
    }

    const choicesHTML = scenario.choices.map((choice, index) => `
        <div class="choice-btn" onclick="handleChoice(${index})">
            <div class="choice-text">${choice.text}</div>
            <div class="choice-impact">
                <span class="${choice.impacts.money >= 0 ? 'impact-money-positive' : 'impact-money-negative'}">
                    💰 ${choice.impacts.money > 0 ? '+' : ''}${choice.impacts.money.toLocaleString()}
                </span>
                <span class="${choice.impacts.stress >= 0 ? 'impact-stress-positive' : 'impact-stress-negative'}">
                    😤 ${choice.impacts.stress > 0 ? '+' : ''}${choice.impacts.stress}
                </span>
                <span class="${choice.impacts.businessGrowth >= 0 ? 'impact-growth-positive' : 'impact-growth-negative'}">
                    📈 ${choice.impacts.businessGrowth > 0 ? '+' : ''}${choice.impacts.businessGrowth}
                </span>
            </div>
        </div>
    `).join('');

    const gameplayHTML = `
        <div class="card gameplay scenario">
            <div class="scenario-title">${scenario.title}</div>
            <div class="scenario-description">${scenario.description}</div>
            <div class="stat-bars">
                ${renderStatBars()}
            </div>
        </div>
        <div class="card">
            <h2 style="margin-bottom: 1.5rem; font-weight: bold;">What do you do?</h2>
            <div class="choices">
                ${choicesHTML}
            </div>
        </div>
    `;

    const containerHTML = `
        ${gameplayHTML}
    `;

    document.querySelector('.container').innerHTML = containerHTML;
}

function renderConsequence() {
    renderHeader();
    const scenario = SCENARIOS[gameState.scenarioIndex];
    const choice = gameState.selectedChoice;
    const impacts = choice.impacts;

    const renderImpactSummary = () => {
        let html = '<h3>Impact of Your Decision:</h3>';
        html += '<div class="impact-item">';
        html += `<span>💰 Money:</span>`;
        html += `<span class="${impacts.money >= 0 ? 'positive' : 'negative'}">₦${impacts.money > 0 ? '+' : ''}${impacts.money.toLocaleString()}</span>`;
        html += '</div>';
        
        html += '<div class="impact-item">';
        html += `<span>😤 Stress:</span>`;
        html += `<span class="${impacts.stress >= 0 ? 'negative' : 'positive'}">${impacts.stress > 0 ? '+' : ''}${impacts.stress}</span>`;
        html += '</div>';
        
        html += '<div class="impact-item">';
        html += `<span>📈 Business Growth:</span>`;
        html += `<span class="${impacts.businessGrowth >= 0 ? 'positive' : 'negative'}">${impacts.businessGrowth > 0 ? '+' : ''}${impacts.businessGrowth}</span>`;
        html += '</div>';
        
        return html;
    };

    const consequenceHTML = `
        <div class="card">
            <div class="consequence-title">📋 Consequence</div>
            <div class="consequence-choice"><strong>Your Choice:</strong> ${choice.text}</div>
            <div class="impact-summary">
                ${renderImpactSummary()}
            </div>
            <div class="tutor-box">
                <h3>👨‍🏫 Tutor's Comment</h3>
                <p>${choice.tutorComment}</p>
            </div>
            <div style="margin-top: 1.5rem;">
                ${renderStatBars()}
            </div>
            <button class="btn btn-continue" onclick="continueToDayPlay()" style="margin-top: 1.5rem;">Next Day →</button>
        </div>
    `;

    document.querySelector('.container').innerHTML = consequenceHTML;

    // Add shake and vignette
    triggerShake();
    triggerVignette();
}

function renderDailySummary() {
    renderHeader();
    const naijaComment = generateNaijaComment();

    const dailySummaryHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h2>📊 Daily Summary</h2>
                <div class="modal-stats">
                    <div class="modal-stat blue">
                        <div class="modal-stat-label">
                            <span>💰 Money</span>
                            <span class="modal-stat-change ${gameState.money >= gameState.oldMoney ? 'positive' : 'negative'}">
                                ${gameState.money >= gameState.oldMoney ? '+' : ''}${(gameState.money - gameState.oldMoney).toLocaleString()}
                            </span>
                        </div>
                        <div class="modal-stat-detail">Now: ₦${gameState.money.toLocaleString()}</div>
                    </div>
                    <div class="modal-stat red">
                        <div class="modal-stat-label">
                            <span>😤 Stress</span>
                            <span class="modal-stat-change ${gameState.stress <= gameState.oldStress ? 'positive' : 'negative'}">
                                ${gameState.stress > gameState.oldStress ? '+' : ''}${gameState.stress - gameState.oldStress}
                            </span>
                        </div>
                        <div class="modal-stat-detail">Now: ${gameState.stress}/100</div>
                    </div>
                    <div class="modal-stat green">
                        <div class="modal-stat-label">
                            <span>📈 Growth</span>
                            <span class="modal-stat-change ${gameState.businessGrowth >= gameState.oldBusinessGrowth ? 'positive' : 'negative'}">
                                ${gameState.businessGrowth >= gameState.oldBusinessGrowth ? '+' : ''}${gameState.businessGrowth - gameState.oldBusinessGrowth}
                            </span>
                        </div>
                        <div class="modal-stat-detail">Now: ${gameState.businessGrowth}/100</div>
                    </div>
                </div>
                <div class="naija-comment">
                    <p>"${naijaComment}"</p>
                </div>
                <button class="btn btn-primary" onclick="closeGameplay()">Day ${gameState.day + 1} →</button>
            </div>
        </div>
    `;

    document.querySelector('.container').innerHTML = dailySummaryHTML;
}

function renderGameOverScreen() {
    const reason = checkGameOver();
    const personality = getPersonalityTitle();

    const gameOverHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 30;">
            <div class="game-over-screen">
                <div class="game-over-modal">
                    <div class="game-over-title">💀 GAME OVER</div>
                    <div class="game-over-message">${reason}</div>
                    <div class="game-over-stats">
                        <div class="game-over-stat"><strong>Day Reached:</strong> ${gameState.day}/30</div>
                        <div class="game-over-stat"><strong>Final Money:</strong> ₦${gameState.money.toLocaleString()}</div>
                        <div class="game-over-stat"><strong>Final Stress:</strong> ${gameState.stress}/100</div>
                        <div class="game-over-stat"><strong>Final Growth:</strong> ${gameState.businessGrowth}/100</div>
                    </div>
                    <button class="btn btn-restart" onclick="restartGame()">Try Again 🔄</button>
                </div>
            </div>
        </div>
    `;

    document.body.innerHTML = gameOverHTML;
}

function renderFinishScreen() {
    // Save final stats to localStorage
    localStorage.setItem('money', gameState.money);
    localStorage.setItem('stress', gameState.stress);
    localStorage.setItem('growth', gameState.businessGrowth);
    localStorage.setItem('currentDay', gameState.day);

    // Redirect to game end page after a short delay
    setTimeout(() => {
        window.location.href = 'gameend.html';
    }, 1000);

    // Show a brief completion message
    const personality = getPersonalityTitle();
    const finishHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 30;">
            <div class="finish-screen">
                <div class="finish-modal">
                    <div class="finish-emoji">${personality.emoji}</div>
                    <div class="finish-title">${personality.title}</div>
                    <div class="finish-message">Congratulations! Redirecting to results...</div>
                    <div style="text-align: center; margin-top: 20px;">⏳ Loading...</div>
                </div>
            </div>
        </div>
    `;

    document.body.innerHTML = finishHTML;
}

// ============ GAME LOGIC ============
function handleChoice(choiceIndex) {
    playSound('click');
    
    const scenario = SCENARIOS[gameState.scenarioIndex];
    const choice = scenario.choices[choiceIndex];

    gameState.selectedChoice = choice;
    gameState.oldMoney = gameState.money;
    gameState.oldStress = gameState.stress;
    gameState.oldBusinessGrowth = gameState.businessGrowth;

    // Apply difficulty multipliers to impacts
    const adjustedImpacts = applyDifficultyMultipliers(choice.impacts);
    
    gameState.money += adjustedImpacts.money;
    gameState.stress += adjustedImpacts.stress;
    gameState.businessGrowth = Math.min(gameState.businessGrowth + adjustedImpacts.businessGrowth, 100);

    gameState.stress = Math.max(0, Math.min(gameState.stress, 100));
    gameState.money = Math.max(0, gameState.money);
    gameState.businessGrowth = Math.max(0, gameState.businessGrowth);

    // Save progress
    saveGameProgress();
    
    gameState.phase = 'consequence';

    // Trigger effects and sounds
    if (adjustedImpacts.money < -20000) {
        playSound('error');
        triggerMoneyFlash();
    } else if (adjustedImpacts.money > 20000) {
        playSound('success');
    }

    render();
}

function continueToDayPlay() {
    const gameOverReason = checkGameOver();
    if (gameOverReason) {
        gameState.phase = 'gameOver';
        render();
        return;
    }

    gameState.day++;

    if (gameState.day > 30) {
        gameState.phase = 'finished';
        render();
        return;
    }

    gameState.phase = 'dailySummary';
    render();
}

function closeGameplay() {
    getRandomScenario();
    gameState.phase = 'playing';
    render();
}

function restartGame() {
    gameState = {
        day: 1,
        money: 150000,
        stress: 30,
        businessGrowth: 20,
        phase: 'playing',
        scenarioIndex: -1,
        selectedChoice: null,
        oldMoney: 150000,
        oldStress: 30,
        oldBusinessGrowth: 20,
    };

    document.body.innerHTML = `
        <div class="header"></div>
        <div class="container"></div>
    `;

    render();
}

// ============ ANIMATION TRIGGERS ============
function triggerShake() {
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
    }
}

function triggerVignette() {
    let vignette = document.querySelector('.vignette');
    if (!vignette) {
        vignette = document.createElement('div');
        vignette.className = 'vignette';
        document.body.appendChild(vignette);
    }

    vignette.style.opacity = '1';
    setTimeout(() => {
        vignette.style.opacity = '0';
        vignette.style.transition = 'opacity 1s ease-out';
    }, 100);
}

function triggerMoneyFlash() {
    const moneyElement = document.querySelector('[style*="Money"]')?.parentElement;
    if (moneyElement) {
        moneyElement.classList.add('flash-red');
        setTimeout(() => moneyElement.classList.remove('flash-red'), 1800);
    }
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initializeTheme();
    
    // Initialize autosave system
    initializeAutosave();
    
    document.body.innerHTML = `
        <div class="header"></div>
        <div class="container"></div>
    `;
    render();
});
