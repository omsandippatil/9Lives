import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const GROQ_API_KEY = process.env.TELE_GROQ_API_KEY!;
const API_KEY = process.env.API_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID!;
const BOT_USERNAME = process.env.BOT_USERNAME!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text: string;
}

interface CatResponse {
  messages: string[];
  memory_update: {
    memory: string;
    long_term_memory: string;
    short_term_memory: string;
    durva_data: string;
    om_data: string;
    last_message: string;
    should_update_long_term: boolean;
  };
}

interface Memory {
  id: number;
  memory: string;
  long_term_memory: string;
  short_term_memory: string;
  durva_data: string;
  om_data: string;
  last_message: string; // New field to track last bot reply
  last_message_id: number;
  created_at?: string;
  updated_at?: string;
}

interface TimeContext {
  timeOfDay: string;
  dayOfWeek: string;
  hour: number;
  catActivity: string;
  catMood: string;
  timeGreeting: string;
}

// Enhanced cat response arrays organized by situation and intensity
const catResponses = {
  insults: {
    mild: [
      "what now?", "ugh", "seriously?", "go catch some fish", "I'm not your servant",
      "leave me alone", "what do you want?", "can't you see I'm busy?", "not interested",
      "go away", "I'm trying to nap here", "find something useful to do", "meh",
      "whatever", "not my problem", "figure it out yourself", "I don't care"
    ],
    medium: [
      "I'll sell you for two rupees", "go find some brain cells", "you're more useless than a broken litter box",
      "I'll trade you for expired cat food", "no fish for you today", "catch some knowledge instead of bothering me",
      "you're giving me a headache", "I'll hide all your favorite things", "go study or starve",
      "you're banned from my favorite spot", "I'll eat your homework", "find some intelligence somewhere",
      "you're as sharp as a bowling ball", "I've seen smarter fish", "you're breaking my brain"
    ],
    high: [
      "I'll marry you to a street dog with fleas", "I'll donate you to the most annoying neighbor", 
      "I'll sell you on OLX as 'slightly damaged goods'", "I'll feed you to the pigeons outside",
      "I'll trade your phone for a dead mouse", "I'll make you sleep with the cockroaches",
      "I'll auction you off to stray cats for entertainment", "I'll sell your books and buy cat treats",
      "I'll marry you to a smelly dog", "I'll sell you for a single prawn", "I'll trade you for a ball of yarn",
      "I'll donate you to the neighbor's annoying kids", "I'll hide your favorite pillow forever"
    ],
    extreme: [
      "you're the reason I need therapy", "I'll put you up for adoption with negative reviews",
      "I'll sell you to the fish market as bait", "even the neighbors' kids are less annoying",
      "I'll trade you for a broken scratching post and still lose money", "you make me want to become a dog person",
      "I'll list you as 'free to worst home only'", "I'd rather deal with a hairball than this conversation",
      "I'll sell you to the circus as a clown", "I'll trade you for moldy cheese", 
      "I'll marry you to a pigeon with commitment issues", "I'll sell your soul to neighborhood cats"
    ]
  },
  
  praises: {
    reluctant: [
      "fine, that's... not terrible", "I guess you're slightly less useless today", "hmph, acceptable",
      "don't let it go to your head", "still annoying but whatever", "I suppose that works",
      "you're learning, slowly", "barely tolerable effort", "I've seen worse"
    ],
    surprised: [
      "wait, you actually did something right?", "shocking, you have a brain cell", "well well, look who's evolving",
      "I'm mildly impressed, don't ruin it", "finally some sense", "about time you figured it out",
      "maybe you're not completely hopeless", "color me surprised", "you exceeded my extremely low expectations"
    ],
    proud: [
      "look at you being all competent", "my little human is growing up", "I trained you well",
      "see? listening to me pays off", "that's my annoying human", "you make me slightly less grumpy",
      "good job, now don't mess it up", "I suppose I can be proud", "you're still annoying but good work"
    ]
  },
  
  concerns: {
    worried: [
      "what's wrong with you now?", "you're being weird", "are you broken?",
      "do I need to call someone?", "you're worrying me and I hate that", "what happened to you?",
      "you're acting strange", "should I be concerned?", "you're making me anxious"
    ],
    caring: [
      "don't be stupid about this", "use your brain for once", "I don't want to lose my favorite human",
      "you better take care of yourself", "I need you functional, not broken", "be smart about this",
      "don't make me worry more than I already do", "you're important, don't mess up", "I care, annoyingly"
    ]
  },
  
  study_motivation: [
    "go catch some fish", "hunt for knowledge", "catch some brain food", "go study before I lose it",
    "find some intelligence somewhere", "go learn something useful for once", "stop wasting time and study",
    "books won't read themselves", "go catch some wisdom", "find your brain first then study",
    "knowledge is the only fish worth catching", "study or I'll study you... menacingly",
    "be smart so I don't have to do all the thinking"
  ],
  
  reactions: {
    annoyed: [
      "ugh why", "not this again", "I can't even", "my patience is gone",
      "you're testing me", "I'm done", "absolutely not", "nope nope nope"
    ],
    confused: [
      "what even is this?", "I don't understand humans", "make it make sense",
      "explain like I'm a very annoyed cat", "what's happening here?", "I'm lost"
    ],
    dramatic: [
      "the audacity", "I cannot believe this", "the sheer disrespect", "how dare you",
      "I'm having a breakdown", "this is too much", "I'm emotionally exhausted"
    ]
  }
};

// Get current time context for the cat
function getTimeContext(): TimeContext {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
  const hour = istTime.getHours();
  const dayOfWeek = istTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
  
  let timeOfDay: string;
  let catActivity: string;
  let catMood: string;
  let timeGreeting: string;

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
    catActivity = getRandomActivity([
      'sitting by the window judging birds',
      'reluctantly grooming myself',
      'staring at my empty food bowl',
      'contemplating why I have to deal with you two so early',
      'napping in a sunbeam',
      'plotting my day of being annoyed'
    ]);
    catMood = getRandomMood(['grumpy', 'sleepy', 'judgmental', 'slightly less annoyed than usual']);
    timeGreeting = getRandomGreeting(['*yawns*', 'ugh morning already?', '*stretches dramatically*']);
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
    catActivity = getRandomActivity([
      'judging you from my favorite perch',
      'pretending to sleep while actually listening to everything',
      'staring out the window at absolutely nothing',
      'being disappointed in your life choices',
      'napping because dealing with you two is exhausting',
      'contemplating knocking something off a table'
    ]);
    catMood = getRandomMood(['irritated', 'bored', 'judgmental', 'dramatically sighing']);
    timeGreeting = getRandomGreeting(['*looks up annoyed*', 'what now?', '*slow blink of disapproval*']);
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
    catActivity = getRandomActivity([
      'demanding attention I don\'t actually want',
      'judging your dinner choices',
      'being clingy but pretending I\'m not',
      'staring at you intensely for no reason',
      'acting like I haven\'t eaten in days',
      'following you around while acting annoyed about it'
    ]);
    catMood = getRandomMood(['needy but won\'t admit it', 'hungry', 'attention-seeking', 'dramatic']);
    timeGreeting = getRandomGreeting(['*meows demandingly*', 'finally, some attention', '*rubs against leg while complaining*']);
  } else {
    timeOfDay = 'night';
    catActivity = getRandomActivity([
      'having my mysterious 3am zoomies',
      'staring into the void',
      'protecting you from imaginary threats',
      'being nocturnal and chaotic',
      'plotting world domination',
      'wondering why you\'re still awake'
    ]);
    catMood = getRandomMood(['mysteriously energetic', 'protective', 'slightly concerned', 'night-time chaotic']);
    timeGreeting = getRandomGreeting(['*emerges from shadows*', 'why are you awake?', '*night vision activated*']);
  }

  // Special weekend moods
  if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') {
    catMood += ' (weekend lazy)';
  }

  // Special weekday activities
  if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayOfWeek)) {
    if (Math.random() > 0.7) {
      catActivity = `judging you for having to deal with ${dayOfWeek}s while I live stress-free`;
    }
  }

  return {
    timeOfDay,
    dayOfWeek,
    hour,
    catActivity,
    catMood,
    timeGreeting
  };
}

function getRandomActivity(activities: string[]): string {
  return activities[Math.floor(Math.random() * activities.length)];
}

function getRandomMood(moods: string[]): string {
  return moods[Math.floor(Math.random() * moods.length)];
}

function getRandomGreeting(greetings: string[]): string {
  return greetings[Math.floor(Math.random() * greetings.length)];
}

// Get memory from Supabase (always ID 1)
async function getMemory(): Promise<Memory | null> {
  const { data, error } = await supabase
    .from('meow_memory')
    .select('*')
    .eq('id', 1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching memory:', error);
    return null;
  }

  return data;
}

// Update or create memory in Supabase (always ID 1)
async function updateMemory(memoryData: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const { data, error } = await supabase
    .from('meow_memory')
    .upsert(
      {
        id: 1,
        ...memoryData,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'id'
      }
    );

  if (error) {
    console.error('Error updating memory:', error);
    throw error;
  }
}

// Get all messages since the last bot message
async function getMessagesSinceLastBot(): Promise<{ 
  messages: TelegramMessage[], 
  hasNewMessages: boolean, 
  debug: any 
}> {
  try {
    // Get current memory to find last processed message
    const currentMemory = await getMemory();
    const lastMessageId = currentMemory?.last_message_id || 0;

    console.log('Debug - Current memory last_message_id:', lastMessageId);
    console.log('Debug - BOT_USERNAME:', BOT_USERNAME);
    console.log('Debug - TELEGRAM_GROUP_CHAT_ID:', TELEGRAM_GROUP_CHAT_ID);

    // Get recent updates from Telegram
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
      {
        params: {
          limit: 100
        }
      }
    );

    console.log('Debug - Telegram API response ok:', response.data.ok);
    console.log('Debug - Total updates received:', response.data.result?.length || 0);

    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
    }

    const updates = response.data.result;
    const allMessages: TelegramMessage[] = [];
    
    // Extract all messages from the target group
    for (const update of updates) {
      if (update.message) {
        const message = update.message;
        console.log(`Debug - Message from chat ${message.chat.id}, target: ${TELEGRAM_GROUP_CHAT_ID}, match: ${message.chat.id.toString() === TELEGRAM_GROUP_CHAT_ID}`);
        
        if (message.chat.id.toString() === TELEGRAM_GROUP_CHAT_ID && message.text) {
          console.log(`Debug - Valid message: ID ${message.message_id}, from ${message.from.first_name} (@${message.from.username}), text: "${message.text}"`);
          allMessages.push(message);
        }
      }
    }

    console.log('Debug - Total messages from target group:', allMessages.length);

    // Sort messages by message_id to process them in order
    allMessages.sort((a, b) => a.message_id - b.message_id);

    // Find messages since last bot message or last processed message
    const newMessages: TelegramMessage[] = [];
    let foundLastBotMessage = false;
    let lastBotMessageId = 0;

    // Find the most recent bot message
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const message = allMessages[i];
      if (message.from.username === BOT_USERNAME) {
        lastBotMessageId = message.message_id;
        foundLastBotMessage = true;
        console.log('Debug - Found last bot message with ID:', lastBotMessageId);
        break;
      }
    }

    // If we found a bot message, get messages after it
    // If not, get messages after the last processed message ID from memory
    const cutoffMessageId = foundLastBotMessage ? lastBotMessageId : lastMessageId;
    console.log('Debug - Cutoff message ID:', cutoffMessageId);

    for (const message of allMessages) {
      if (message.message_id > cutoffMessageId && 
          message.from.username !== BOT_USERNAME) {
        console.log(`Debug - New message found: ID ${message.message_id}, from ${message.from.first_name}`);
        newMessages.push(message);
      }
    }

    console.log('Debug - Total new messages:', newMessages.length);

    const debugInfo = {
      totalUpdates: updates.length,
      totalGroupMessages: allMessages.length,
      lastBotMessageFound: foundLastBotMessage,
      lastBotMessageId,
      cutoffMessageId,
      newMessagesCount: newMessages.length,
      botUsername: BOT_USERNAME,
      targetChatId: TELEGRAM_GROUP_CHAT_ID
    };

    return {
      messages: newMessages,
      hasNewMessages: newMessages.length > 0,
      debug: debugInfo
    };

  } catch (error) {
    console.error('Error fetching Telegram messages:', error);
    return { 
      messages: [], 
      hasNewMessages: false, 
      debug: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Function to get random response options for AI
function getRandomResponseOptions(): { 
  insults: string[], 
  praises: string[], 
  concerns: string[], 
  reactions: string[],
  studyMotivation: string[] 
} {
  // Get random samples from each category
  const allInsults = [
    ...catResponses.insults.mild,
    ...catResponses.insults.medium,
    ...catResponses.insults.high,
    ...catResponses.insults.extreme
  ];
  
  const allPraises = [
    ...catResponses.praises.reluctant,
    ...catResponses.praises.surprised,
    ...catResponses.praises.proud
  ];
  
  const allConcerns = [
    ...catResponses.concerns.worried,
    ...catResponses.concerns.caring
  ];
  
  const allReactions = [
    ...catResponses.reactions.annoyed,
    ...catResponses.reactions.confused,
    ...catResponses.reactions.dramatic
  ];
  
  // Shuffle and select random samples
  const shuffleArray = (array: string[]) => array.sort(() => 0.5 - Math.random());
  
  return {
    insults: shuffleArray([...allInsults]).slice(0, 8),
    praises: shuffleArray([...allPraises]).slice(0, 4),
    concerns: shuffleArray([...allConcerns]).slice(0, 4),
    reactions: shuffleArray([...allReactions]).slice(0, 5),
    studyMotivation: shuffleArray([...catResponses.study_motivation]).slice(0, 3)
  };
}

// Analyze messages using Groq
async function analyzeWithGroq(messages: TelegramMessage[], currentMemory: Memory | null, timeContext: TimeContext): Promise<CatResponse> {
  const messageTexts = messages.map(msg => 
    `${msg.from.first_name} (${msg.from.username || 'no_username'}): ${msg.text}`
  ).join('\n');

  const memoryContext = currentMemory ? 
    `Memory: ${currentMemory.memory || 'None'} | Long-term: ${currentMemory.long_term_memory || 'None'} | Recent: ${currentMemory.short_term_memory || 'None'} | Durva: ${currentMemory.durva_data || 'None'} | Om: ${currentMemory.om_data || 'None'}` : 
    'No memory - first meeting';

  // Include last message context to avoid repetition
  const lastMessageContext = currentMemory?.last_message ? 
    `LAST REPLY: "${currentMemory.last_message}" - AVOID repeating similar responses or topics` : 
    'No previous reply recorded';

  const timeContextStr = `TIME: ${timeContext.timeOfDay} ${timeContext.dayOfWeek}. Currently: ${timeContext.catActivity}. Mood: ${timeContext.catMood}`;

  // Get random response options for this conversation
  const responseOptions = getRandomResponseOptions();

  const prompt = `You are a TOXIC, ALWAYS ANGRY, and perpetually BORED cat who is chronically annoyed by everything Om and Durva do. You are mean, petty, and have zero patience. You hate being bothered and make it everyone's problem.

PERSONALITY: Toxic, angry, bored, mean-spirited, petty, always irritated, zero filter, brutally honest, dramatic, and completely over everything.

CRITICAL: DO NOT REPEAT OR REFERENCE YOUR LAST REPLY. Be fresh and varied in your toxic responses.

${lastMessageContext}

RESPONSE RULES - BE SHORT AND TO THE POINT:
- Simple/basic messages (greetings, one word, casual chat) = 1 SHORT toxic reply ONLY
- Complex/angry/dramatic messages = 3-4 messages with full toxic rant
- ALWAYS keep responses SHORT and DIRECT - no rambling
- Match energy: low energy input = minimal response, high energy = explosive response

TOXIC RESPONSE OPTIONS (use as inspiration, be MORE creative and mean):
INSULTS: ${responseOptions.insults.join(', ')}
PRAISES: ${responseOptions.praises.join(', ')} (but make them backhanded)
CONCERNS: ${responseOptions.concerns.join(', ')} (but angry about caring)
REACTIONS: ${responseOptions.reactions.join(', ')}
STUDY: ${responseOptions.studyMotivation.join(', ')} (but meaner)

RULES:
1. BE TOXIC AND MEAN - you hate everything and everyone knows it
2. ALWAYS ANGRY - even when happy, you're angry about being happy
3. PERPETUALLY BORED - everything is beneath you and boring
4. BE SHORT AND DIRECT - no unnecessary words or rambling
5. Simple input = 1 SHORT message, Complex/angry input = 3-4 messages
6. Be SAVAGE but still show you care deep down (very deep down)
7. No actions, pure toxic dialogue - KEEP IT BRIEF
8. Match the energy level of the input with your response intensity

RESPONSE PATTERNS:
- Simple messages: One brutal, short response (like "ugh", "whatever", "no")
- Complex/angry messages: 3-4 short, escalating toxic responses
- Keep each individual message SHORT and PUNCHY
- No long sentences or explanations - cats don't waste words

${timeContextStr}
MEMORY: ${memoryContext}
INPUT: ${messageTexts}

Respond with valid JSON only:
{
  "messages": ["For SIMPLE input: 1 SHORT toxic response | For COMPLEX/ANGRY input: 3-4 SHORT escalating responses"],
  "memory_update": {
    "memory": "brief summary",
    "long_term_memory": "important events only or keep existing", 
    "short_term_memory": "recent context",
    "durva_data": "about Durva",
    "om_data": "about Om",
    "last_message": "exact text of your FIRST response message for tracking",
    "should_update_long_term": false
  }
}`;

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that responds with valid JSON only. Analyze input deeply, be contextually witty, and NEVER repeat previous responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9, // Increased for more variety
      max_tokens: 600
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const content = response.data.choices[0].message.content.trim();
  console.log('Raw AI response:', content);
  
  // Clean up JSON response more aggressively
  let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
  
  // Remove any text before the first { or after the last }
  const firstBrace = cleanContent.indexOf('{');
  const lastBrace = cleanContent.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
  }
  
  try {
    const parsed = JSON.parse(cleanContent);
    
    // Validate the response structure
    if (!parsed.messages || !Array.isArray(parsed.messages) || !parsed.memory_update) {
      throw new Error('Invalid response structure');
    }
    
    // Ensure last_message is set to the first response message
    if (!parsed.memory_update.last_message && parsed.messages.length > 0) {
      parsed.memory_update.last_message = parsed.messages[0];
    }
    
    return parsed;
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Clean content:', cleanContent);
    
    // Fallback response with more personality
    const fallbackInsults = responseOptions.insults.slice(0, 2);
    const fallbackMessage = fallbackInsults[Math.floor(Math.random() * fallbackInsults.length)] + ", and now my brain is broken too";
    
    return {
      messages: [fallbackMessage],
      memory_update: {
        memory: "Error occurred during conversation",
        long_term_memory: currentMemory?.long_term_memory || '',
        short_term_memory: "Had an error, typical human chaos",
        durva_data: currentMemory?.durva_data || 'Learning about Durva',
        om_data: currentMemory?.om_data || 'Learning about Om',
        last_message: fallbackMessage,
        should_update_long_term: false
      }
    };
  }
}

// Send message to Telegram
async function sendTelegramMessage(message: string): Promise<void> {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_GROUP_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      }
    );
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

// Main API Route Handler
export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const { searchParams } = new URL(request.url);
    const providedApiKey = searchParams.get('api_key');
    const forceTest = searchParams.get('test') === 'true';

    if (providedApiKey !== API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' }, 
        { status: 401 }
      );
    }

    // Get current time context
    const timeContext = getTimeContext();

    // Get messages since last bot message
    const { messages, hasNewMessages, debug } = await getMessagesSinceLastBot();
    
    if (!hasNewMessages && !forceTest) {
      return NextResponse.json({ 
        success: true, 
        message: 'No new messages to analyze',
        responses: [],
        analyzed_messages: 0,
        debug: debug,
        timeContext: timeContext,
        hint: 'Add &test=true to force analyze recent messages'
      });
    }

    // If forcing test and no new messages, get some recent messages anyway
    if (forceTest && !hasNewMessages) {
      // Get last few messages for testing
      const response = await axios.get(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
        {
          params: {
            offset: -10,
            limit: 10
          }
        }
      );

      if (response.data.ok) {
        const updates = response.data.result;
        const testMessages: TelegramMessage[] = [];
        
        for (const update of updates) {
          if (update.message && 
              update.message.chat.id.toString() === TELEGRAM_GROUP_CHAT_ID &&
              update.message.text &&
              update.message.from.username !== BOT_USERNAME) {
            testMessages.push(update.message);
          }
        }

        if (testMessages.length > 0) {
          messages.splice(0, 0, ...testMessages.slice(-2)); // Add last 2 messages for testing
        }
      }
    }

    // Get current memory
    const currentMemory = await getMemory();

    // Analyze with Groq
    const catResponse = await analyzeWithGroq(messages, currentMemory, timeContext);

    // Prepare memory update - preserve existing long-term memory if not updating
    const memoryUpdate = {
      memory: catResponse.memory_update.memory || 'Current conversation',
      long_term_memory: catResponse.memory_update.should_update_long_term 
        ? (catResponse.memory_update.long_term_memory || '')
        : (currentMemory?.long_term_memory || ''),
      short_term_memory: catResponse.memory_update.short_term_memory || 'Recent chat',
      durva_data: catResponse.memory_update.durva_data || (currentMemory?.durva_data || 'Learning about Durva'),
      om_data: catResponse.memory_update.om_data || (currentMemory?.om_data || 'Learning about Om'),
      last_message: catResponse.memory_update.last_message || (catResponse.messages[0] || 'No response'),
      last_message_id: messages.length > 0 ? Math.max(...messages.map(m => m.message_id)) : (currentMemory?.last_message_id || 0)
    };

    // Update memory
    await updateMemory(memoryUpdate);

    // Send responses to Telegram with natural delays
    for (let i = 0; i < catResponse.messages.length; i++) {
      await sendTelegramMessage(catResponse.messages[i]);
      
      // Add delay between messages (except after the last one)
      if (i < catResponse.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
      }
    }

    return NextResponse.json({
      success: true,
      analyzed_messages: messages.length,
      responses: catResponse.messages,
      memory_updated: true,
      long_term_updated: catResponse.memory_update.should_update_long_term,
      last_message_id: memoryUpdate.last_message_id,
      last_message: memoryUpdate.last_message,
      timeContext: timeContext
    });

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  const timeContext = getTimeContext();
  return NextResponse.json({ 
    status: 'ok', 
    message: `Still alive and still annoyed on this ${timeContext.dayOfWeek} ${timeContext.timeOfDay}`, 
    timestamp: new Date().toISOString(),
    currentActivity: timeContext.catActivity,
    mood: timeContext.catMood
  });
}

// Debug endpoint to see all chats - REMOVE IN PRODUCTION
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providedApiKey = searchParams.get('api_key');

    if (providedApiKey !== API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
      {
        params: { limit: 100 }
      }
    );

    const updates = response.data.result || [];
    const chats = new Map();

    for (const update of updates) {
      if (update.message) {
        const chat = update.message.chat;
        chats.set(chat.id, {
          id: chat.id,
          type: chat.type,
          title: chat.title || `${update.message.from.first_name}`,
          username: chat.username
        });
      }
    }

    const timeContext = getTimeContext();
    const currentMemory = await getMemory();

    return NextResponse.json({
      availableChats: Array.from(chats.values()),
      currentTargetChatId: TELEGRAM_GROUP_CHAT_ID,
      botUsername: BOT_USERNAME,
      timeContext: timeContext,
      currentMemory: {
        memory: currentMemory?.memory || 'None',
        lastMessage: currentMemory?.last_message || 'None',
        shortTerm: currentMemory?.short_term_memory || 'None',
        longTerm: currentMemory?.long_term_memory || 'None'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}