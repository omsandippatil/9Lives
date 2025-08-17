// Fetch recent Telegram messages for context
async function fetchRecentTelegramMessages(limit: number = 10): Promise<string[]> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=${limit}&offset=-${limit}`);
    const data = await response.json();
    
    if (data.ok && data.result) {
      return data.result
        .filter((update: any) => update.message && update.message.chat.id.toString() === TELEGRAM_GROUP_CHAT_ID)
        .map((update: any) => {
          const msg = update.message;
          const sender = msg.from?.first_name || 'Unknown';
          const text = msg.text || '';
          const time = new Date(msg.date * 1000).toLocaleTimeString();
          return `[${time}] ${sender}: ${text}`;
        })
        .slice(-5);
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch Telegram messages:', error);
    return [];
  }
}

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GROQ_API_KEY = process.env.TELE_GROQ_API_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_KEY = process.env.API_KEY!;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID!;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: GROQ_API_KEY });

// Target cats to monitor
const TARGET_CATS = ['durvadongre@gmail.com', 'omsandeeppatil02@gmail.com'];

interface CatActivity {
  email: string;
  coding_questions_attempted: number;
  technical_questions_attempted: number;
  fundamental_questions_attempted: number;
  tech_topics_covered: number;
  aptitude_questions_attempted: number;
  hr_questions_attempted: number;
  artificial_intelligence_topics_covered: number;
  system_design_covered: number;
  java_lang_covered: number;
  python_lang_covered: number;
  sql_lang_covered: number;
  current_streak: any;
}

interface DailyGoals {
  coding: 5;
  aptitude: 50;
  java: 1;
  python: 1;
  sql: 1;
  hr: 1;
  ai: 1;
  systemDesign: 1;
  technical: 50;
  fundamental: 50;
}

interface TopicData {
  techq_topics: string;
  fundaq_topics: string;
  tech_topic: string;
  system_design: string;
  dayNumber: number;
}

const DAILY_GOALS: DailyGoals = {
  coding: 5,
  aptitude: 50,
  java: 1,
  python: 1,
  sql: 1,
  hr: 1,
  ai: 1,
  systemDesign: 1,
  technical: 50,
  fundamental: 50
};

// Enhanced cat response templates
const CAT_THREATS = [
  "I'll marry you to a smelly street dog",
  "No fish for you this week",
  "You'll sleep outside with the rats",
  "I'll tell all the neighbor cats how lazy you are",
  "No sunny windowsill spot for you",
  "You'll get the stale kibble while others feast",
  "I'll make you clean the litter box with your paws",
  "The neighbor's cat is getting better jobs than you will",
  "You'll end up working at a call center forever",
  "I'll donate your favorite blanket to charity",
  "No belly rubs until you improve",
  "You'll marry someone who hates cats",
  "I'll hide all the catnip from you",
  "Even the street cats are more disciplined",
  "You'll never catch a decent mouse at this rate"
];

const CAT_INSULTS = [
  "lazier than a sleeping sloth",
  "more useless than a broken scratching post",
  "slower than a turtle in molasses",
  "dumber than a goldfish",
  "less motivated than a dead mouse",
  "more disappointing than empty food bowl",
  "weaker than wet tissue paper",
  "more pathetic than a declawed cat",
  "less sharp than a butter knife",
  "more scattered than spilled litter"
];

const CAT_PRAISE = [
  "You made mama's heart purr with pride",
  "Finally acting like my proper kitten",
  "You deserve the premium tuna today",
  "Good kitty gets the warmest sunspot",
  "You've earned extra head scratches",
  "Mama is genuinely impressed",
  "You're becoming a proper hunter",
  "This is exactly what I expect from my babies",
  "You get the comfy bed tonight",
  "Even the neighbor cats would be jealous"
];

const CAT_COMPARISONS = [
  "Look how much better [name] is doing",
  "[name] is clearly the smarter kitten today",
  "Why can't you be more like [name]",
  "[name] makes me proud while you disappoint",
  "Even [name] is laughing at your performance",
  "[name] gets treats while you get shame",
  "I'm telling [name] what a failure you are",
  "[name] is obviously my favorite today"
];

// Cat GIFs for different emotions
const CAT_GIFS = {
  angry: [
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmpxZzhtYTl2cXp6c2E1NXNpYm1yYno3OGE2cXlxeGNwd2dtbjNuayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vySkPlXaNO0ElMIkeo/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnRmaWhnanplZzgya2w1eDg5emxiOTFmaDZjajMzMjI1bDBscmRuMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ul0rmVRjQHD9ELz8ZJ/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnRmaWhnanplZzgya2w1eDg5emxiOTFmaDZjajMzMjI1bDBscmRuMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xbQGFaIph1wf2oOJpV/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW8wbGJ2aWk0c3Z6N204amF4ZWV3OXEwbTFtd254c3N1NmZ5NWFjciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/bcqAMUTUHoLDy/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW8wbGJ2aWk0c3Z6N204amF4ZWV3OXEwbTFtd254c3N1NmZ5NWFjciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/A0lTlnxCyVogONSvum/giphy.gif'
  ],
  disappointed: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW8wbGJ2aWk0c3Z6N204amF4ZWV3OXEwbTFtd254c3N1NmZ5NWFjciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rho9L4MsYXaec/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdG14NzN3eWY2NHl4ZWNyZHA1OHlsYms3bWptcTBsbmJha21lbnRkciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3OhXBaoR1tVPW/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdG14NzN3eWY2NHl4ZWNyZHA1OHlsYms3bWptcTBsbmJha21lbnRkciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CM1rHbKDMH2BW/giphy.gif',
  ],
  furious: [
    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDUycTM4Z2IweHN3NTZpZjhpNXY0cXZvcTg0dmQ3a28yNTd3eWEwZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lkuRLPYa6PDj2SPIwJ/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2RtMDkyaHdrZXIyemtqenJxY3ZoeWVudWg1OHM1dGdlb2tsdzJwMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/B0voyStDsmiStwcBoh/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2RtMDkyaHdrZXIyemtqenJxY3ZoeWVudWg1OHM1dGdlb2tsdzJwMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LWveaUTd8a9Bw7MdYO/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2RtMDkyaHdrZXIyemtqenJxY3ZoeWVudWg1OHM1dGdlb2tsdzJwMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/YmVNzDnboB0RQEpmLr/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnRmaWhnanplZzgya2w1eDg5emxiOTFmaDZjajMzMjI1bDBscmRuMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/lQ7MZzxAHHFikzh2Cz/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdG14NzN3eWY2NHl4ZWNyZHA1OHlsYms3bWptcTBsbmJha21lbnRkciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/wfS4vDyVsASQygl4mN/giphy.gif'
  ],
  satisfied: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWpkZG9majdhY2RicjR5NDNhaDhkamRnMDkxbnI4eGx6cmRweWpleCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1rzHSymOFmy0Do1Mb0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGN3OGgwMmgzMWJqa2VlZWZ0Y2Y3NGQ4N3F6MHh3MHdta2ZiOTJwNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NfzERYyiWcXU4/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGN3OGgwMmgzMWJqa2VlZWZ0Y2Y3NGQ4N3F6MHh3MHdta2ZiOTJwNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1DTBGm5Rfgymk/giphy.gif'
  ],
  proud: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazVjMXN2NmdhazRiOGRmcGVwdngzczI1dnZyMjF5ZHh2djNqdnQ4eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ToCRja2miF3Xi/giphy.gif'
  ],
  happy: [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWpkZG9majdhY2RicjR5NDNhaDhkamRnMDkxbnI4eGx6cmRweWpleCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1rzHSymOFmy0Do1Mb0/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazVjMXN2NmdhazRiOGRmcGVwdngzczI1dnZyMjF5ZHh2djNqdnQ4eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ToCRja2miF3Xi/giphy.gif'
  ]
};

// Calculate day number from August 18, 2026
function getDayNumber(): number {
  const startDate = new Date('2025-08-16');
  const currentDate = new Date();
  const diffTime = currentDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// Get random GIF from category
function getRandomGif(category: keyof typeof CAT_GIFS): string {
  const gifs = CAT_GIFS[category];
  return gifs[Math.floor(Math.random() * gifs.length)];
}

// Get random element from array
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Check streak status - handle various formats from database
function analyzeStreakStatus(current_streak: any): { isCurrent: boolean, streakDays: number, daysBehind: number, isBroken: boolean } {
  console.log('Raw streak data:', current_streak, typeof current_streak);
  
  if (!current_streak) {
    return { isCurrent: false, streakDays: 0, daysBehind: 1, isBroken: true };
  }
  
  let lastUpdated = '';
  let streakDays = 0;
  
  try {
    // Handle PostgreSQL JSON column data
    if (typeof current_streak === 'object' && current_streak !== null) {
      // Direct object format
      if (current_streak.last_date_updated || current_streak.date) {
        lastUpdated = current_streak.last_date_updated || current_streak.date || '';
        streakDays = current_streak.streak_days || current_streak.days || 0;
      }
      // Array format within object
      else if (Array.isArray(current_streak)) {
        lastUpdated = current_streak[0] || '';
        streakDays = parseInt(current_streak[1]) || 0;
      }
      // Handle weird PostgreSQL array representation
      else if (current_streak[0] !== undefined) {
        lastUpdated = current_streak[0] || '';
        streakDays = parseInt(current_streak[1]) || 0;
      }
    }
    // Handle string JSON
    else if (typeof current_streak === 'string') {
      const parsed = JSON.parse(current_streak);
      if (Array.isArray(parsed)) {
        lastUpdated = parsed[0] || '';
        streakDays = parseInt(parsed[1]) || 0;
      } else {
        lastUpdated = parsed.last_date_updated || parsed.date || '';
        streakDays = parsed.streak_days || parsed.days || 0;
      }
    }
  } catch (e) {
    console.error('Error parsing streak:', e);
    return { isCurrent: false, streakDays: 0, daysBehind: 1, isBroken: true };
  }
  
  const today = new Date().toISOString().split('T')[0];
  console.log('Streak check:', { lastUpdated, streakDays, today });
  
  // If streak was updated today, it's current
  if (lastUpdated === today) {
    return { isCurrent: true, streakDays, daysBehind: 0, isBroken: false };
  }
  
  // Calculate days behind
  if (lastUpdated) {
    const todayMs = new Date(today).getTime();
    const lastMs = new Date(lastUpdated).getTime();
    const daysBehind = Math.max(1, Math.ceil((todayMs - lastMs) / (1000 * 60 * 60 * 24)));
    return { isCurrent: false, streakDays, daysBehind, isBroken: true };
  }
  
  return { isCurrent: false, streakDays, daysBehind: 1, isBroken: true };
}

// Fetch today's topics
async function fetchTodaysTopics(dayNumber: number): Promise<TopicData> {
  try {
    const [techqData, fundaqData, techTopicsData, systemDesignData] = await Promise.all([
      supabase.from('techq_topics').select('id, topic_name').eq('id', dayNumber).single(),
      supabase.from('fundaq_topics').select('id, topic_name').eq('id', dayNumber).single(),
      supabase.from('tech_topics').select('id, name').eq('id', dayNumber).single(),
      supabase.from('system_design').select('id, name').eq('id', dayNumber).single()
    ]);

    return {
      techq_topics: techqData.data?.topic_name || 'Mystery Topic',
      fundaq_topics: fundaqData.data?.topic_name || 'Unknown Fundamentals',
      tech_topic: techTopicsData.data?.name || 'Some Tech Thing',
      system_design: systemDesignData.data?.name || 'System Design Challenge',
      dayNumber
    };
  } catch (error) {
    console.error('Error fetching topics:', error);
    return {
      techq_topics: 'Arrays and Strings',
      fundaq_topics: 'Data Structures',
      tech_topic: 'JavaScript',
      system_design: 'Load Balancer',
      dayNumber
    };
  }
}

// Fetch cat daily activities
async function fetchCatActivities(): Promise<CatActivity[]> {
  try {
    // First, get user IDs and their streak data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, current_streak')
      .in('email', TARGET_CATS);

    if (userError) {
      console.error('User data error:', userError);
    }

    // Then get daily activity data using the user IDs
    const userIds = userData?.map(user => user.id) || [];
    const { data: dailyData, error: dailyError } = await supabase
      .from('today')
      .select('*')
      .in('uid', userIds);

    if (dailyError) {
      console.error('Daily data error:', dailyError);
    }

    return TARGET_CATS.map(email => {
      const user = userData?.find(u => u.email === email);
      const dailyActivity = dailyData?.find(d => d.uid === user?.id);
      
      return {
        email,
        coding_questions_attempted: dailyActivity?.coding_questions_attempted || 0,
        technical_questions_attempted: dailyActivity?.technical_questions_attempted || 0,
        fundamental_questions_attempted: dailyActivity?.fundamental_questions_attempted || 0,
        tech_topics_covered: dailyActivity?.tech_topics_covered || 0,
        aptitude_questions_attempted: dailyActivity?.aptitude_questions_attempted || 0,
        hr_questions_attempted: dailyActivity?.hr_questions_attempted || 0,
        artificial_intelligence_topics_covered: dailyActivity?.artificial_intelligence_topics_covered || 0,
        system_design_covered: dailyActivity?.system_design_covered || 0,
        java_lang_covered: dailyActivity?.java_lang_covered || 0,
        python_lang_covered: dailyActivity?.python_lang_covered || 0,
        sql_lang_covered: dailyActivity?.sql_lang_covered || 0,
        current_streak: user?.current_streak || null
      };
    });
  } catch (error) {
    console.error('Error fetching cat activities:', error);
    return TARGET_CATS.map(email => ({
      email,
      coding_questions_attempted: 0,
      technical_questions_attempted: 0,
      fundamental_questions_attempted: 0,
      tech_topics_covered: 0,
      aptitude_questions_attempted: 0,
      hr_questions_attempted: 0,
      artificial_intelligence_topics_covered: 0,
      system_design_covered: 0,
      java_lang_covered: 0,
      python_lang_covered: 0,
      sql_lang_covered: 0,
      current_streak: [null, 0]
    }));
  }
}

// Generate balanced cat mama message
async function generateBalancedCatMomMessage(catActivities: CatActivity[], topics: TopicData, recentMessages: string[]): Promise<string[]> {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  const processedCats = catActivities.map(cat => {
    let name = '';
    if (cat.email.includes('durvadongre')) {
      name = 'Durva';
    } else if (cat.email.includes('omsandeeppatil')) {
      name = 'Om';
    } else {
      name = cat.email.split('@')[0];
    }
    
    // Calculate completion percentage
    const goals = [
      { name: 'Coding Questions', completed: cat.coding_questions_attempted, target: DAILY_GOALS.coding },
      { name: 'Technical Questions', completed: cat.technical_questions_attempted, target: DAILY_GOALS.technical },
      { name: 'Fundamental Questions', completed: cat.fundamental_questions_attempted, target: DAILY_GOALS.fundamental },
      { name: 'Aptitude Questions', completed: cat.aptitude_questions_attempted, target: DAILY_GOALS.aptitude },
      { name: 'Java Topics', completed: cat.java_lang_covered, target: DAILY_GOALS.java },
      { name: 'Python Topics', completed: cat.python_lang_covered, target: DAILY_GOALS.python },
      { name: 'SQL Topics', completed: cat.sql_lang_covered, target: DAILY_GOALS.sql },
      { name: 'HR Questions', completed: cat.hr_questions_attempted, target: DAILY_GOALS.hr },
      { name: 'AI Topics', completed: cat.artificial_intelligence_topics_covered, target: DAILY_GOALS.ai },
      { name: 'System Design', completed: cat.system_design_covered, target: DAILY_GOALS.systemDesign }
    ];
    
    const completedGoals = goals.filter(g => g.completed >= g.target).length;
    const totalGoals = goals.length;
    const completionRate = (completedGoals / totalGoals) * 100;
    
    const missedGoals = goals.filter(g => g.completed < g.target);
    const streakStatus = analyzeStreakStatus(cat.current_streak);
    
    return {
      name,
      completionRate,
      completedGoals,
      totalGoals,
      missedGoals,
      streakCurrent: streakStatus.isCurrent,
      streakDays: streakStatus.streakDays,
      daysBehind: streakStatus.daysBehind,
      streakBroken: streakStatus.isBroken,
      isPerfect: completedGoals === totalGoals,
      goals
    };
  });

  const contextSection = recentMessages.length > 0 ? 
    `Recent chat context:\n${recentMessages.join('\n')}\n\n` : '';

  const omCat = processedCats.find(c => c.name === 'Om') || processedCats[0];
  const durvaCat = processedCats.find(c => c.name === 'Durva') || processedCats[1];

  // Determine mood and response type
  const averageCompletion = (omCat.completionRate + durvaCat.completionRate) / 2;
  let responseType = '';
  let gifCategory: keyof typeof CAT_GIFS = 'angry';
  
  if (omCat.isPerfect && durvaCat.isPerfect) {
    responseType = 'both_perfect';
    gifCategory = 'proud';
  } else if (omCat.isPerfect || durvaCat.isPerfect) {
    responseType = 'one_perfect';
    gifCategory = 'satisfied';
  } else if (averageCompletion >= 75) {
    responseType = 'decent';
    gifCategory = 'satisfied';
  } else if (averageCompletion >= 50) {
    responseType = 'average';
    gifCategory = 'disappointed';
  } else if (averageCompletion >= 25) {
    responseType = 'bad';
    gifCategory = 'angry';
  } else {
    responseType = 'terrible';
    gifCategory = 'furious';
  }

  const omMissedDetails = omCat.missedGoals.map(g => `${g.name}: ${g.completed}/${g.target}`).join(', ');
  const durvaMissedDetails = durvaCat.missedGoals.map(g => `${g.name}: ${g.completed}/${g.target}`).join(', ');

  // Create enhanced arrays with random elements
  const selectedThreats = [
    getRandomElement(CAT_THREATS),
    getRandomElement(CAT_THREATS),
    getRandomElement(CAT_THREATS)
  ];
  
  const selectedInsults = [
    getRandomElement(CAT_INSULTS),
    getRandomElement(CAT_INSULTS)
  ];
  
  const selectedPraise = [
    getRandomElement(CAT_PRAISE),
    getRandomElement(CAT_PRAISE)
  ];
  
  const selectedComparison = getRandomElement(CAT_COMPARISONS);

  const prompt = `You are a toxic, dramatic cat mama checking on Om and Durva. Be brutal but loving.

PERFORMANCE DATA:
Om: ${omCat.completedGoals}/${omCat.totalGoals} goals (${Math.round(omCat.completionRate)}%) | Failed: ${omMissedDetails || 'Nothing'}
Durva: ${durvaCat.completedGoals}/${durvaCat.totalGoals} goals (${Math.round(durvaCat.completionRate)}%) | Failed: ${durvaMissedDetails || 'Nothing'}

Use these as INSPIRATION (don't copy exactly):
Threats: ${selectedThreats.join(' | ')}
Insults: ${selectedInsults.join(' | ')}
Praise: ${selectedPraise.join(' | ')}
Compare: ${selectedComparison}

RULES:
- Short messages (1-2 sentences each)
- Compare them directly
- Be dramatic and creative
- Mention specific missed goals
- Mix threats with tough love
- 5-6 total messages

Return as JSON array of strings.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: 600,
      top_p: 0.9
    });

    const response = completion.choices[0]?.message?.content || '';
    console.log('Raw AI response:', response);
    
    // Try to parse as JSON first
    let messages: string[] = [];
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        messages = parsed.filter(msg => typeof msg === 'string' && msg.trim().length > 0);
      }
    } catch (parseError) {
      console.log('Not valid JSON, attempting to extract JSON...');
      
      // Look for JSON array in the response
      const jsonMatch = response.match(/\[([\s\S]*?)\]/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          if (Array.isArray(extracted)) {
            messages = extracted.filter(msg => typeof msg === 'string' && msg.trim().length > 0);
          }
        } catch (extractError) {
          console.log('Could not extract JSON array');
        }
      }
      
      if (messages.length === 0) {
        // Fallback: split by common delimiters
        messages = response
          .split(/(?:\n\s*\n|\n\d+[\.)]\s*|^[\d-]+[\.)]\s*)/m)
          .map(msg => msg.replace(/^["']|["']$/g, '').trim())
          .filter(msg => msg.length > 10);
        
        if (messages.length === 0) {
          messages = [response.trim()];
        }
      }
    }
    
    // Add strategic GIFs
    const finalMessages: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      finalMessages.push(messages[i]);
      
      // Add GIFs at strategic points
      if (i === Math.floor(messages.length / 2) - 1) {
        finalMessages.push(getRandomGif(gifCategory));
      }
    }
    
    // End with appropriate GIF
    if (messages.length > 0) {
      finalMessages.push(getRandomGif(gifCategory));
    }
    
    return finalMessages;
    
  } catch (error) {
    console.error('Error generating cat mom message:', error);
    
    // Enhanced fallback messages with random elements
    const fallbackMessages = [];
    const threat = getRandomElement(CAT_THREATS);
    const insult = getRandomElement(CAT_INSULTS);
    const praise = getRandomElement(CAT_PRAISE);
    
    if (omCat.isPerfect && durvaCat.isPerfect) {
      fallbackMessages.push(`Both my kittens are finally acting right! ${praise}`);
      fallbackMessages.push("This is exactly what mama expects - keep it up!");
    } else if (omCat.isPerfect) {
      fallbackMessages.push(`Om is clearly the smarter kitten today - ${praise}`);
      fallbackMessages.push(`Durva, you're ${insult} compared to Om - ${threat}`);
      fallbackMessages.push(`Om completed everything while Durva failed at: ${durvaMissedDetails}`);
    } else if (durvaCat.isPerfect) {
      fallbackMessages.push(`Durva makes me proud while Om disappoints me completely`);
      fallbackMessages.push(`Om, you're ${insult} - ${threat}`);
      fallbackMessages.push(`Look at what you missed: ${omMissedDetails}`);
    } else {
      fallbackMessages.push(`Both my kittens are ${insult} today - absolutely shameful!`);
      fallbackMessages.push(`Om missed: ${omMissedDetails}. Durva missed: ${durvaMissedDetails}`);
      fallbackMessages.push(`${threat} - both of you need serious improvement!`);
    }
    
    fallbackMessages.push(getRandomGif(gifCategory));
    return fallbackMessages;
  }
}

// Send messages to Telegram with proper delay
async function sendCatMessagesToTelegram(messages: string[]): Promise<{ success: boolean; messageIds?: number[]; error?: string }> {
  try {
    const messageIds: number[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      let requestBody: any;
      
      // Check if message is a GIF URL
      if (message.startsWith('https://') && message.includes('giphy.com')) {
        // Send as animation/GIF
        requestBody = {
          chat_id: TELEGRAM_GROUP_CHAT_ID,
          animation: message
        };
      } else {
        // Send as text message
        requestBody = {
          chat_id: TELEGRAM_GROUP_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        };
      }
      
      const endpoint = message.startsWith('https://') && message.includes('giphy.com') 
        ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAnimation`
        : `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (result.ok) {
        messageIds.push(result.result.message_id);
        // Longer pause for GIFs, shorter for text
        const delay = message.startsWith('https://') ? 3000 : 2000;
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        console.error('Telegram API error:', result);
        return { success: false, error: result.description || 'Telegram API error' };
      }
    }
    
    return { success: true, messageIds };
  } catch (error) {
    console.error('Failed to send cat messages to Telegram:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Main handler
async function handleBalancedCatCheck() {
  console.log('Balanced cat mama checking on her kittens...');
  
  const dayNumber = getDayNumber();
  
  const [catActivities, topics, recentMessages] = await Promise.all([
    fetchCatActivities(),
    fetchTodaysTopics(dayNumber),
    fetchRecentTelegramMessages(10)
  ]);

  console.log('Cat activities:', catActivities);
  console.log('Topics:', topics);

  const catMessages = await generateBalancedCatMomMessage(catActivities, topics, recentMessages);
  console.log('Generated balanced cat mama messages:', catMessages);

  const telegramResult = await sendCatMessagesToTelegram(catMessages);

  return {
    dayNumber,
    topics,
    catActivities,
    catMessages,
    recentMessages,
    telegramResult
  };
}

// API endpoints
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providedApiKey = searchParams.get('api_key');

    if (!providedApiKey || providedApiKey !== API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await handleBalancedCatCheck();

    return NextResponse.json({
      success: result.telegramResult.success,
      message: result.telegramResult.success ? 'Balanced cat mama checked on her kittens 🐱' : 'Failed to send cat messages',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providedApiKey = searchParams.get('api_key');

  if (!providedApiKey || providedApiKey !== API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await handleBalancedCatCheck();

    return NextResponse.json({
      success: result.telegramResult.success,
      message: result.telegramResult.success ? 'Balanced cat mama sent loving guidance to her kittens 🐱' : 'Failed to send cat messages',
      method: 'GET',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}