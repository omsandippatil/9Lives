import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Environment variables (make sure to set these)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_KEY = process.env.API_KEY!;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID!;

// Initialize client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TopicData {
  techq_topics: string;
  fundaq_topics: string;
  tech_topic: string;
  system_design: string;
  dayNumber: number;
}

// Calculate day number from August 18, 2026
function getDayNumber(): number {
  const startDate = new Date('2026-08-18');
  const currentDate = new Date();
  const diffTime = currentDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// Calculate question numbers for technical and fundamental (50 questions each)
function getQuestionNumber(dayNumber: number): number {
  return ((dayNumber - 1) * 50) + 1;
}

// Fetch topics from database
async function fetchTopics(dayNumber: number): Promise<TopicData> {
  try {
    const [techqData, fundaqData, techTopicsData, systemDesignData] = await Promise.all([
      supabase.from('techq_topics').select('id, topic_name').eq('id', dayNumber).single(),
      supabase.from('fundaq_topics').select('id, topic_name').eq('id', dayNumber).single(),
      supabase.from('tech_topics').select('id, name').eq('id', dayNumber).single(),
      supabase.from('system_design').select('id, name').eq('id', dayNumber).single()
    ]);

    if (techqData.error) throw new Error(`Error fetching techq_topics: ${techqData.error.message}`);
    if (fundaqData.error) throw new Error(`Error fetching fundaq_topics: ${fundaqData.error.message}`);
    if (techTopicsData.error) throw new Error(`Error fetching tech_topics: ${techTopicsData.error.message}`);
    if (systemDesignData.error) throw new Error(`Error fetching system_design: ${systemDesignData.error.message}`);

    return {
      techq_topics: techqData.data.topic_name,
      fundaq_topics: fundaqData.data.topic_name,
      tech_topic: techTopicsData.data.name,
      system_design: systemDesignData.data.name,
      dayNumber
    };
  } catch (error) {
    throw new Error(`Database fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Bank of Momma Cat motivational messages
function getMommaCatMessage(): string {
  const mommaCatMessages = [
    "🐾 Alright kittens, I'm going out to hunt. When I get back, I better see some progress or we're having a serious chat.",
    
    "😾 You've been scrolling for an hour. Stop. Just... stop. Get to work before I get cranky.",
    
    "🐱 *sits directly in front of your screen* Pay attention to me... I mean, pay attention to your studies!",
    
    "🐾 I raised you better than this. Don't make me disappointed. You know that face I make? Yeah, that one.",
    
    "😼 My tail is doing that twitchy thing. You know what that means. Time to focus, little one.",
    
    "🐱 Your cousin Whiskers just landed a tech job. WHISKERS. Let that sink in for a moment.",
    
    "🐾 *gentle head bump* I believe in you, but believing doesn't finish the work. Get moving.",
    
    "😾 I've been patient. Very patient. But my patience has limits, and we're approaching them.",
    
    "🐱 Stop batting at that cursor like it's a toy mouse and actually click on something useful.",
    
    "🐾 I didn't teach you to hunt just so you could give up at the first sign of difficulty. Keep trying.",
    
    "😸 You're making that face like when you used to hate bath time. But this is good for you too.",
    
    "🐱 The neighbor's dog learned Python. A DOG. I'm not saying anything else about that.",
    
    "🐾 *knocks pen off desk* Oops. Now pick it up and use it to take notes while you study.",
    
    "😼 I can see you from the kitchen. Yes, I know you're procrastinating. Get back to it.",
    
    "🐱 Remember when you were little and I'd drag you back to the nest? Don't make me do that again.",
    
    "🐾 You've got that glazed look in your eyes. Stretch, get some water, then back to learning.",
    
    "😾 I'm sharpening my claws on the scratching post. Very loudly. Take the hint.",
    
    "🐱 *purrs softly while staring intensely* This is supportive purring. With consequences if ignored.",
    
    "🐾 Your deadline is coming up fast. Faster than when I chase you around the house at 3am.",
    
    "😸 I love you dearly, but I love successful kittens even more. Be successful.",
    
    "🐱 Stop giving me those big eyes. They worked when you were tiny, but not anymore. Study.",
    
    "🐾 *yawns* I was going to nap, but someone needs supervision apparently.",
    
    "😼 The sun moved from my favorite spot because you've been sitting there so long. Time's up.",
    
    "🐱 You're being as stubborn as when you refused to use the litter box. This will end the same way.",
    
    "🐾 *gentle paw tap on keyboard* Less social media, more GitHub. You know I'm right.",
    
    "😾 I'm getting that feeling like when you're about to knock something expensive off a shelf. Fix this.",
    
    "🐱 Mama's tired of giving the same lecture. You know what you need to do.",
    
    "🐾 *settles down nearby with judgmental eyes* I'll just wait here until you're done. However long it takes.",
    
    "😸 You used to be so eager to learn new things. What happened? Find that kitten again.",
    
    "🐱 I've seen you debug for hours when you're motivated. Channel that energy now.",
    
    "🐾 *slow blink* That's cat for 'I love you but please get your act together.'"
  ];

  return mommaCatMessages[Math.floor(Math.random() * mommaCatMessages.length)];
}

// Send motivational message to Telegram group
async function sendMommaCatReminder(
  topics: TopicData,
  links: { text: string; url: string }[]
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const mommaCatMessage = getMommaCatMessage();
    
    const message = `${mommaCatMessage}

📚 <b>Day ${topics.dayNumber} - Don't make Momma wait!</b>

Today's must-do list (or else...):
• ${topics.techq_topics}
• ${topics.fundaq_topics}
• ${topics.tech_topic}
• ${topics.system_design}

Get to work, my little kittens! 🐾`;

    // Create inline keyboard with direct links
    const inlineKeyboard = [
      [
        { text: `🔧 Technical Challenge`, url: links[0].url }
      ],
      [
        { text: `📚 Fundamentals`, url: links[1].url }
      ],
      [
        { text: `💡 Tech Deep Dive`, url: links[2].url }
      ],
      [
        { text: `🏗️ System Design`, url: links[3].url }
      ],
      [
        { text: `😾 I'm Done, Momma!`, callback_data: 'study_complete' }
      ]
    ];

    console.log('Sending Momma Cat reminder to Telegram group:', TELEGRAM_GROUP_CHAT_ID);
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      return { success: true, messageId: result.result.message_id };
    } else {
      console.error('Telegram API error:', result);
      return { success: false, error: result.description || 'Unknown Telegram API error' };
    }
  } catch (error) {
    console.error('Failed to send Momma Cat reminder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Get total user count for statistics
async function getUserCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error(`Error counting users: ${error.message}`);
    return count || 0;
  } catch (error) {
    console.warn('Could not fetch user count:', error);
    return 0;
  }
}

// Main function to handle the momma cat reminder flow
async function handleMommaCatReminder() {
  console.log('Starting Momma Cat reminder API...');
  
  // Calculate day number
  const dayNumber = getDayNumber();
  console.log(`Day ${dayNumber} - Momma Cat is checking on her kittens!`);

  // Fetch topics
  console.log('Fetching topics from database...');
  const topics = await fetchTopics(dayNumber);

  // Create links
  const questionNumber = getQuestionNumber(dayNumber);
  const links = [
    { text: 'Technical', url: `https://9-lives.vercel.app/technical/${questionNumber}` },
    { text: 'Fundamental', url: `https://9-lives.vercel.app/fundamental/${questionNumber}` },
    { text: 'Tech Topics', url: `https://9-lives.vercel.app/tech-topics/${dayNumber}` },
    { text: 'System Design', url: `https://9-lives.vercel.app/system-design/${dayNumber}` }
  ];

  // Send reminder message
  console.log('Sending Momma Cat reminder to Telegram group...');
  const messageResult = await sendMommaCatReminder(topics, links);

  // Get user count for statistics
  const userCount = await getUserCount();

  return {
    dayNumber,
    topics: {
      technical: topics.techq_topics,
      fundamental: topics.fundaq_topics,
      techTopics: topics.tech_topic,
      systemDesign: topics.system_design
    },
    links: links.map(link => link.url),
    messageResult,
    userCount,
    reminderType: 'momma_cat_motivation'
  };
}

// POST handler for Next.js App Router
export async function POST(request: NextRequest) {
  try {
    // Check API key authentication
    const { searchParams } = new URL(request.url);
    const providedApiKey = searchParams.get('api_key');

    if (!providedApiKey || providedApiKey !== API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized: Invalid or missing API key' 
        },
        { status: 401 }
      );
    }

    const result = await handleMommaCatReminder();

    if (result.messageResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Momma Cat has spoken! Reminder sent successfully.',
        ...result,
        telegramResult: {
          sent: true,
          messageId: result.messageResult.messageId,
          groupChatId: TELEGRAM_GROUP_CHAT_ID,
          userCount: result.userCount
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Momma Cat could not send her reminder',
        telegramError: result.messageResult.error,
        ...result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Momma Cat API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Momma Cat encountered an unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providedApiKey = searchParams.get('api_key');

  if (!providedApiKey || providedApiKey !== API_KEY) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unauthorized: Invalid or missing API key' 
      },
      { status: 401 }
    );
  }

  try {
    const result = await handleMommaCatReminder();

    if (result.messageResult.success) {
      return NextResponse.json({
        success: true,
        method: 'GET',
        message: 'Momma Cat reminder sent via GET request!',
        ...result,
        telegramResult: {
          sent: true,
          messageId: result.messageResult.messageId,
          groupChatId: TELEGRAM_GROUP_CHAT_ID,
          userCount: result.userCount
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Momma Cat could not send her reminder',
        telegramError: result.messageResult.error,
        method: 'GET',
        ...result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Momma Cat API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Momma Cat encountered an unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}