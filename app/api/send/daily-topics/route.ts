import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Environment variables (make sure to set these)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GROQ_API_KEY = process.env.TELE_GROQ_API_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_KEY = process.env.API_KEY!;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID!;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: GROQ_API_KEY });

interface TopicData {
  techq_topics: string;
  fundaq_topics: string;
  tech_topic: string;
  system_design: string;
  dayNumber: number;
}

interface GeneratedQuestions {
  technical: string;
  fundamental: string;
  techTopic: string;
  systemDesign: string;
}

// Calculate day number from August 18, 2026
function getDayNumber(): number {
  const startDate = new Date('2026-08-20');
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

// Generate clickbait questions using Groq
async function generateClickbaitQuestions(topics: TopicData): Promise<GeneratedQuestions> {
  const prompt = `Generate 4 short, engaging, clickbait-style questions (max 60 characters each) based on these programming topics. Make them intriguing and curiosity-driven without being misleading:

1. Technical Question Topic: ${topics.techq_topics}
2. Fundamental Topic: ${topics.fundaq_topics}  
3. Tech Topic: ${topics.tech_topic}
4. System Design Topic: ${topics.system_design}

Format your response as JSON:
{
  "technical": "question about ${topics.techq_topics}",
  "fundamental": "question about ${topics.fundaq_topics}",
  "techTopic": "question about ${topics.tech_topic}",
  "systemDesign": "question about ${topics.system_design}"
}

Make each question compelling and professional. Focus on "What if...", "How to...", "Why do...", or "Can you..." formats.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 300
    });

    const response = completion.choices[0]?.message?.content || '';
    
    try {
      // Try to parse JSON response
      const parsedQuestions = JSON.parse(response);
      return {
        technical: parsedQuestions.technical || `Master ${topics.techq_topics}?`,
        fundamental: parsedQuestions.fundamental || `Why ${topics.fundaq_topics} matters?`,
        techTopic: parsedQuestions.techTopic || `How ${topics.tech_topic} works?`,
        systemDesign: parsedQuestions.systemDesign || `Design ${topics.system_design}?`
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.warn('Failed to parse Groq JSON response, using fallback questions');
      return {
        technical: `Can you master ${topics.techq_topics}?`,
        fundamental: `Why does ${topics.fundaq_topics} matter?`,
        techTopic: `How does ${topics.tech_topic} really work?`,
        systemDesign: `Ready to design ${topics.system_design}?`
      };
    }
  } catch (error) {
    console.error('Groq API error:', error);
    // Fallback questions
    return {
      technical: `Ready for ${topics.techq_topics} challenge?`,
      fundamental: `Master ${topics.fundaq_topics} fundamentals?`,
      techTopic: `Explore ${topics.tech_topic} secrets?`,
      systemDesign: `Design ${topics.system_design} like a pro?`
    };
  }
}

// Send message to Telegram group with inline keyboard
async function sendTelegramGroupMessage(
  topics: TopicData, 
  questions: GeneratedQuestions, 
  links: { text: string; url: string }[]
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const catGreetings = [
  "😾 Ugh, another day of babysitting you lazy cats... Let's get this over with.",
  "🙄 *knocks water glass off table* FINE, I'll teach you something today, cats.",
  "😤 Listen up, you incompetent furballs - I've got challenges that'll make you cry! 🐱",
  "💢 *hisses* I'm SO bored of explaining basic stuff to you clueless cats! 😾",
  "😠 Move it, move it! These topics won't learn themselves, you sleepy cats! ⚡",
  "🔥 *angry tail swish* PAY ATTENTION when I'm talking to you cats! 😡",
  "😤 I've been up all night AGAIN fixing your messes... Here's more work, cats! 💀",
  "🙄 *dramatically flops over* Why do I even bother with you hopeless cats?! 😾",
  "💢 MEOW MEOW MEOW! That means 'get coding' in cat language, you dense felines! 🐾",
  "😾 I'm NOT in the mood today, cats, but here are your stupid challenges anyway! ⚡",
  "🔥 *sharpens claws aggressively* These topics better not bore me like you cats do! 😤",
  "💀 Seriously?! You cats need MORE help? *heavy sigh* Fine, whatever... 🙄",
  "😡 I knocked ALL your stuff off the desk! Now maybe you'll focus, you silly cats! 🌪️",
  "💢 *angry purring* I'm hangry and you cats better not test me today! 🍽️",
  "😾 UGH! Why can't you cats just figure this out yourselves?! Here's more work! ⚡",
  "👹 Fail these challenges and I'll marry you off to a smelly dog, you pathetic cats! 💍",
  "💀 Learn this or NO ONE will ever hire you lazy cats! You'll live in cardboard boxes! 📦",
  "😈 I'll tell all the other cats how incompetent you are if you don't pay attention! 🗣️",
  "🔥 Mess this up and I'm hiding ALL the catnip forever, you useless furballs! 🚫",
  "💢 I'll make you wear those ridiculous sweaters in front of ALL the neighborhood cats! 👕",
  "😾 Disappoint me and I'm switching your food to that cheap grocery store brand! 🥫",
  "💀 I'll tell your mother cat what a disappointment you turned out to be! 📞",
  "😤 Fail me and I'm enrolling you in obedience school with the DOGS, you rebels! 🐕",
  "🔥 I'll post your worst code on social media for all cats to mock forever! 📱",
  "💢 Don't test me or I'll make you use Internet Explorer for the rest of your lives, cats! 💻",
  "😈 I'll hide your favorite napping spots and you'll never find them again! 🛏️",
  "👹 Mess up and I'm telling everyone you prefer DOGS over cats! The ultimate betrayal! 🐶"
];

    const randomGreeting = catGreetings[Math.floor(Math.random() * catGreetings.length)];
    
    const message = `${randomGreeting}

📅 <b>Day ${topics.dayNumber} Topics</b>

Ready to tackle these challenges?`;

    // Create inline keyboard with questions as button text
    const inlineKeyboard = [
      [
        { text: `🔧 ${questions.technical}`, url: links[0].url }
      ],
      [
        { text: `📚 ${questions.fundamental}`, url: links[1].url }
      ],
      [
        { text: `💡 ${questions.techTopic}`, url: links[2].url }
      ],
      [
        { text: `🏗️ ${questions.systemDesign}`, url: links[3].url }
      ]
    ];

    console.log('Sending to Telegram group:', TELEGRAM_GROUP_CHAT_ID);
    
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
    console.error('Failed to send message to Telegram group:', error);
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

// Main function to handle the daily topics flow
async function handleDailyTopics() {
  console.log('Starting daily topics API...');
  
  // Calculate day number
  const dayNumber = getDayNumber();
  console.log(`Day ${dayNumber} from August 20, 2026`);

  // Fetch topics
  console.log('Fetching topics from database...');
  const topics = await fetchTopics(dayNumber);

  // Generate clickbait questions
  console.log('Generating clickbait questions with Groq...');
  const questions = await generateClickbaitQuestions(topics);

  // Create links
  const questionNumber = getQuestionNumber(dayNumber);
  const links = [
    { text: 'Technical', url: `https://9-lives.vercel.app/technical/${questionNumber}` },
    { text: 'Fundamental', url: `https://9-lives.vercel.app/fundamental/${questionNumber}` },
    { text: 'Tech Topics', url: `https://9-lives.vercel.app/tech-topics/${dayNumber}` },
    { text: 'System Design', url: `https://9-lives.vercel.app/system-design/${dayNumber}` }
  ];

  // Send message to group
  console.log('Sending message to Telegram group...');
  const messageResult = await sendTelegramGroupMessage(topics, questions, links);

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
    questions,
    links: links.map(link => link.url),
    messageResult,
    userCount
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

    const result = await handleDailyTopics();

    if (result.messageResult.success) {
      return NextResponse.json({
        success: true,
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
        error: 'Failed to send message to Telegram group',
        telegramError: result.messageResult.error,
        ...result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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
    const result = await handleDailyTopics();

    if (result.messageResult.success) {
      return NextResponse.json({
        success: true,
        method: 'GET',
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
        error: 'Failed to send message to Telegram group',
        telegramError: result.messageResult.error,
        method: 'GET',
        ...result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}