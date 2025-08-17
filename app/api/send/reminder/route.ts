import { NextRequest, NextResponse } from 'next/server';

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_KEY = process.env.API_KEY!;
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID!;

// Bank of Momma Cat motivational messages
function getMommaCatMessage(): string {
  const mommaCatMessages = [
    "You came home early today. Don't think I didn't notice. Now march over to that computer and study before I make you marry that smelly dog next door. 😾",
    
    "I see you lounging around like you own the place. Your interview is in two weeks and you're acting like it's nap time. No fish for you today if you don't open those coding books RIGHT NOW. 🐾",
    
    "Listen here, fuzzy brain. I didn't raise you to be a lazy house cat. Get to work on those algorithms or I'm replacing your tuna with dog food for a week. 😼",
    
    "Your cousin Whiskers just landed a job at Microsoft. WHISKERS. The one who couldn't figure out how to use a mouse. What's your excuse, genius? 🙄",
    
    "Don't make me come over there and sit on your keyboard. You know I will. And I know exactly where you don't want me to step. 😈",
    
    "I've been watching you scroll TikTok for 3 hours. Three. Hours. Keep this up and I'm arranging your marriage to that annoying Chihuahua from apartment 3B. 💍🐕",
    
    "You think you're slick hiding behind that screen? I can see you procrastinating from across the room. No treats until you finish that coding challenge. 🚫🍪",
    
    "Your interview is coming up faster than I chase my tail when no one's watching. Get serious or get ready for a lifetime of disappointment and dry kibble. ⏰",
    
    "I didn't spend all those nights teaching you to code just so you could waste time playing video games. Move it or I'm hiding all your favorite snacks. 🎮❌",
    
    "The neighbor's goldfish learned Python. A GOLDFISH. With a three-second memory. Are you going to let a fish show you up? 🐠💻",
    
    "Stop giving me those pathetic eyes. They don't work anymore. You want sympathy? Show me a completed LeetCode problem first. 🥺❌",
    
    "I'm sharpening my claws and eyeing your favorite chair. You know what that means. Get studying before I redecorate your furniture. 🪑💥",
    
    "You've been 'taking a break' for 6 hours. That's not a break, that's retirement. And you're too young to retire, so GET MOVING. ⏳",
    
    "I saw you close that coding tutorial the second you heard the doorbell. Sneaky little furball. No belly rubs until you finish what you started. 🚪👀",
    
    "Your technical interview is next week and you're acting like it's optional. Keep this up and I'm setting you up on a blind date with that yappy Pomeranian. 💔🐕",
    
    "I didn't teach you to hunt just so you could give up when the prey gets tough. These coding problems are your mice - catch them. 🐭💻",
    
    "You think you're stressed now? Wait until you're unemployed and I'm the only one paying for your food. Suddenly motivated? Good. 💸",
    
    "I've seen you stay up all night binge-watching shows. Channel that dedication into your career before I channel my claws into your gaming setup. 📺💀",
    
    "The hiring manager called. Just kidding. But they will, and when they do, you better be ready or I'm telling everyone about that embarrassing thing you did as a kitten. 📞😏",
    
    "Stop acting like studying is optional. It's not. Neither is my patience, and you're testing both right now. ⚠️",
    
    "You know that face I make when you try to give me a bath? That's the face interviewers will make if you don't prepare properly. 🛁😠",
    
    "I'm getting that twitchy feeling in my whiskers. You know what that means - trouble's coming if you don't shape up immediately. 👁️",
    
    "Your future depends on what you do today, not on how comfortable that couch looks. Move your fuzzy behind before I move it for you. 🛋️➡️",
    
    "I've been patient. Very patient. But my patience has limits, and so does the food in your bowl if you don't start working. 🍽️⏰",
    
    "Companies are hiring NOW. While you're napping, others are grinding. Don't make me drag you to success by your scruff. 😴💼",
    
    "You want to impress me? Show me a GitHub commit. You want to disappoint me? Keep doing whatever this lazy nonsense is. 💻✅",
    
    "I'm calling that nice dog trainer tomorrow if you don't start acting like the intelligent cat I raised. The choice is yours. 🐕‍🦺📞",
    
    "Your resume looks emptier than your food bowl after I forget to feed you. Fill both or face the consequences. 📄🍽️",
    
    "I see you eyeing that nap spot by the window. Don't even think about it. Sunbathing is for cats who've earned their treats. ☀️🚫",
    
    "Remember when you were little and afraid of the vacuum? That's nothing compared to how scary unemployment will be. Get studying. 🔌😱",
    
    "Your coding skills are rustier than my old scratching post. Polish them up before I polish my disappointed parent speech. 🪵💻",
    
    "I'm not asking, I'm telling. Close Netflix, open your IDE, and show me what my excellent parenting produced. 📺➡️💻",
    
    "You think you're grown now? Prove it by landing a job instead of landing on the couch every day. 🛋️💼",
    
    "I've been keeping track. You've started 47 tutorials and finished 3. Those are rookie numbers. Pump them up or pump gas for a living. 📊⛽",
    
    "Your interview prep schedule is more scattered than litter after a toddler's been in the box. Get organized or get disappointed. 📅💥",
    
    "I didn't meow my way through raising you just to watch you fail now. Success is not optional in this house. 🏠✅",
    
    "You know what's worse than stepping on a LEGO barefoot? Explaining to me why you bombed that technical interview. 🧱😤",
    
    "I'm considering adopting that motivated German Shepherd down the hall. At least he knows what hard work looks like. 🐕💪",
    
    "Your potential is bigger than your procrastination, but barely. Tip the scales before I tip your food bowl into the trash. ⚖️🗑️",
    
    "You've got two choices: study now or explain to your future broke self why you didn't. I know which one hurts less. 💸😢",
    
    "I'm getting old and I want grandkittens who can afford their own fancy feast. Make it happen or make yourself scarce. 👵🐱",
    
    "The couch will be there after you get hired. Your opportunities won't. Priorities, kitten. 🛋️⏰",
    
    "You're testing my love, and trust me, my disappointment is stronger than my affection right now. Fix this. 💔😾",
    
    "I've seen corpses with more motivation than you're showing. Prove you're alive and get to work. ⚰️💀",
    
    "Your excuses are weaker than decaf coffee and twice as disappointing. Give me results or give me silence. ☕😴",
    
    "I'm about to do something we'll both regret if you don't close that social media app and open your textbook. 📱📚",
    
    "Your career isn't going to build itself while you're building castles in Minecraft. Choose your reality wisely. 🏰💼",
    
    "I raised a hunter, not a house pet. Start acting like the predator I know you can be and catch that dream job. 🐾🎯",
    
    "You want to make mama proud? Stop making mama worry about your future and start making moves toward success. 💕➡️🏆",
    
    "Time's ticking faster than my tail when I'm annoyed. And trust me, you don't want to see how annoyed I can get. ⏰😡",
    
    "Your comfort zone is about to become very uncomfortable if you don't step out of it and into your career. 🛋️➡️💼"
  ];

  return mommaCatMessages[Math.floor(Math.random() * mommaCatMessages.length)];
}

// Send motivational message to Telegram group
async function sendMommaCatReminder(): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const mommaCatMessage = getMommaCatMessage();
    
    const message = `${mommaCatMessage}`;

    console.log('Sending Momma Cat reminder to Telegram group:', TELEGRAM_GROUP_CHAT_ID);
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
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

// Main function to handle the momma cat reminder flow
async function handleMommaCatReminder() {
  console.log('Momma Cat is checking on her kittens...');
  
  // Send reminder message
  console.log('Sending Momma Cat reminder to Telegram group...');
  const messageResult = await sendMommaCatReminder();

  return {
    messageResult,
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
        telegramResult: {
          sent: true,
          messageId: result.messageResult.messageId,
          groupChatId: TELEGRAM_GROUP_CHAT_ID
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Momma Cat could not send her reminder',
        telegramError: result.messageResult.error
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
        telegramResult: {
          sent: true,
          messageId: result.messageResult.messageId,
          groupChatId: TELEGRAM_GROUP_CHAT_ID
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Momma Cat could not send her reminder',
        telegramError: result.messageResult.error,
        method: 'GET'
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