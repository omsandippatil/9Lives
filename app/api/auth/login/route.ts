// app/api/auth/login/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Debug environment variables
console.log('=== ENVIRONMENT VARIABLES CHECK ===')
console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
console.log('NODE_ENV:', process.env.NODE_ENV)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing required environment variables!')
  console.error('URL:', !!supabaseUrl, 'Service Key:', !!supabaseServiceKey, 'Anon Key:', !!supabaseAnonKey)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  console.log('=== LOGIN ROUTE STARTED ===')
  console.log('Request method:', request.method)
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))

  try {
    // Test if we can parse the request body
    let requestBody;
    try {
      requestBody = await request.json()
      console.log('Request body parsed successfully')
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 })
    }

    const { email, password } = requestBody

    console.log('Extracted credentials:', { 
      email: email ? 'provided' : 'missing', 
      password: password ? 'provided' : 'missing',
      emailValue: email // For debugging - remove in production
    })

    if (!email || !password) {
      console.log('Missing credentials - returning 400')
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    console.log('Login attempt for:', email)

    // Test database connection first
    console.log('Testing database connection...')
    try {
      const { data: testQuery, error: testError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('Database connection test failed:', testError)
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: testError.message
        }, { status: 500 })
      }
      console.log('Database connection successful')
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection error',
        details: dbError instanceof Error ? dbError.message : 'Unknown db error'
      }, { status: 500 })
    }

    // Step 1: Check if user exists in your custom users table
    console.log('Querying users table for email:', email)
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single()

    console.log('User query result:', {
      found: !!userRecord,
      error: userError?.message,
      errorCode: userError?.code
    })

    if (userError || !userRecord) {
      console.error('User not found in users table:', userError)
      return NextResponse.json({ 
        error: 'Invalid email or password',
        debug: {
          userFound: !!userRecord,
          errorMessage: userError?.message,
          errorCode: userError?.code
        }
      }, { status: 401 })
    }

    // Step 2: Verify password
    console.log('Verifying password...')
    if (!userRecord.password_hash) {
      console.error('No password hash found for user')
      return NextResponse.json({ 
        error: 'Invalid email or password',
        debug: 'No password hash in database'
      }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, userRecord.password_hash)
    console.log('Password verification result:', passwordMatch)

    if (!passwordMatch) {
      console.log('Password mismatch for user:', email)
      return NextResponse.json({ 
        error: 'Invalid email or password',
        debug: 'Password mismatch'
      }, { status: 401 })
    }

    console.log('Password verified for user:', email)

    // Step 3: Handle Supabase Auth
    let authUser = null
    let authSession = null

    console.log('Starting Supabase Auth process...')

    try {
      // First try to sign in with existing credentials
      console.log('Attempting sign in...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })

      console.log('Sign in attempt result:', {
        hasUser: !!signInData.user,
        hasSession: !!signInData.session,
        error: signInError?.message
      })

      if (signInData.user && signInData.session) {
        authUser = signInData.user
        authSession = signInData.session
        console.log('Successfully signed in existing user')
      } else {
        console.log('Sign in failed, checking if user exists in auth...')
        
        // Check if user exists in Supabase Auth
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) {
          console.error('Error listing users:', listError)
        } else {
          console.log('Found', users?.length || 0, 'users in auth system')
        }
        
        const existingAuthUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        
        if (existingAuthUser) {
          console.log('User exists in auth, updating password...')
          // Update password and try again
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingAuthUser.id,
            { password }
          )
          
          if (updateError) {
            console.error('Failed to update password:', updateError)
          } else {
            console.log('Password updated, trying sign in again...')
            // Try signing in again with updated password
            const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
              email: email.toLowerCase().trim(),
              password
            })
            
            if (retrySignIn.user && retrySignIn.session) {
              authUser = retrySignIn.user
              authSession = retrySignIn.session
              console.log('Successfully signed in after password update')
            } else {
              console.error('Still failed to sign in after password update:', retryError)
            }
          }
        } else {
          // Create new user in Supabase Auth
          console.log('Creating new auth user...')
          const { data: newAuthData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase().trim(),
            password: password,
            email_confirm: true,
            user_metadata: {
              created_from_custom_table: true
            }
          })

          if (createError) {
            console.error('Failed to create auth user:', createError)
            return NextResponse.json({ 
              error: 'Failed to create authentication record',
              details: createError.message,
              debug: 'Auth user creation failed'
            }, { status: 500 })
          }

          authUser = newAuthData.user
          console.log('Created new auth user:', authUser?.id)

          // Sign them in to get a session
          console.log('Signing in newly created user...')
          const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password
          })

          if (newSignInError || !newSignInData.session) {
            console.error('Failed to sign in new user:', newSignInError)
            return NextResponse.json({ 
              error: 'Authentication failed after user creation',
              details: newSignInError?.message,
              debug: 'New user sign in failed'
            }, { status: 500 })
          }

          authSession = newSignInData.session
          authUser = newSignInData.user
        }
      }
    } catch (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: 'Authentication system error',
        details: authError instanceof Error ? authError.message : 'Unknown auth error',
        debug: 'Exception in auth process'
      }, { status: 500 })
    }

    // Ensure we have a valid session
    if (!authSession || !authUser) {
      console.error('No valid session or user after authentication attempts')
      return NextResponse.json({ 
        error: 'Authentication failed',
        debug: {
          hasAuthSession: !!authSession,
          hasAuthUser: !!authUser
        }
      }, { status: 500 })
    }

    console.log('Authentication successful, proceeding with profile setup...')

    // Step 4: Update your users table with the auth UUID if needed
    if (authUser && (!userRecord.id || userRecord.id !== authUser.id)) {
      console.log('Updating users table with auth UUID...')
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ id: authUser.id })
        .eq('email', email.toLowerCase().trim())

      if (updateError) {
        console.error('Failed to update user ID:', updateError)
        // Don't fail the login for this, but log it
      } else {
        console.log('Successfully updated user ID in users table')
      }
    }

    // Step 5: Get full user profile using the auth UUID
    console.log('Fetching user profile...')
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        coding_questions_attempted,
        technical_questions_attempted,
        fundamental_questions_attempted,
        tech_topics_covered,
        current_streak,
        total_points,
        created_at,
        updated_at
      `)
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError)
    } else {
      console.log('User profile fetched successfully')
    }

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: authUser.id,
        email: authUser.email,
        email_verified: authUser.email_confirmed_at !== null
      },
      profile: userProfile || null,
      debug: 'Login completed successfully'
    })

    // Set cookies with proper security settings
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/'
    }

    response.cookies.set('supabase-access-token', authSession.access_token, cookieOptions)
    response.cookies.set('supabase-refresh-token', authSession.refresh_token, cookieOptions)
    response.cookies.set('supabase-user-id', authUser.id, cookieOptions)
    response.cookies.set('supabase-user-email', authUser.email || '', cookieOptions)

    console.log('Login successful for user:', authUser.id)
    console.log('=== LOGIN ROUTE COMPLETED SUCCESSFULLY ===')
    return response

  } catch (error) {
    console.error('=== UNEXPECTED LOGIN ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: 'Unexpected error in login route'
    }, { status: 500 })
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  console.log('=== OPTIONS REQUEST ===')
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}