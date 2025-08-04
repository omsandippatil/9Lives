'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CodeEditor from './CodeEditor';
import ResultPopup from './ResultPopup';

interface TestCase {
  input: string;
  expected_output: string;
  description: string;
}

interface UserProfile {
  id: string
  email: string
  coding_questions_attempted: number
  technical_questions_attempted: number
  fundamental_questions_attempted: number
  tech_topics_covered: number
  current_streak: [string, number] | null // JSONB format: ["2025-08-04", 1]
  total_points: number
  created_at: string
  updated_at: string
}

interface ActualCodingProps {
  question: string;
  className: string;
  functionName: string;
  completeCode: string;
  explanation: string;
  timeComplexity: string;
  spaceComplexity: string;
  inputFormat: string;
  outputFormat: string;
  testCases: TestCase[];
  language: string;
  onNext: () => void;
  questionId: number; // Add this prop to pass the question ID directly
}

export default function ActualCoding({
  question,
  className,
  functionName,
  completeCode,
  explanation,
  timeComplexity,
  spaceComplexity,
  inputFormat,
  outputFormat,
  testCases,
  language,
  onNext,
  questionId
}: ActualCodingProps) {
  const params = useParams();
  const currentQuestionId = parseInt(params.id as string); // Get sr_no from URL
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [showSolution, setShowSolution] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    testResults?: { passed: boolean; input: string; expected: string; output: string }[];
    pointsAwarded?: number;
  } | null>(null);

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get streak display based on JSONB format
  const getStreakDisplay = (currentStreak: [string, number] | null) => {
    console.log('getStreakDisplay called with:', { currentStreak, type: typeof currentStreak });
    
    if (!currentStreak || !Array.isArray(currentStreak) || currentStreak.length < 2) {
      console.log('No valid streak data, returning 0');
      return `0`;
    }
    
    const [dateStr, streakValue] = currentStreak;
    console.log('Streak data:', { dateStr, streakValue });
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const streakDate = new Date(dateStr);
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();
    const streakDateStr = streakDate.toDateString();
    
    console.log('Date comparison:', { todayStr, yesterdayStr, streakDateStr });
    
    if (streakDateStr === todayStr) {
      // Current date - show just the number
      console.log('Today - showing:', streakValue);
      return `${streakValue}`;
    } else if (streakDateStr === yesterdayStr) {
      // Yesterday's date - show number and emoji in gray
      console.log('Yesterday - showing:', streakValue);
      return (
        <span className="text-gray-400">
          {streakValue} 🔥
        </span>
      );
    } else {
      // Older date - show 0
      console.log('Older date - showing: 0');
      return `0`;
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('Profile fetch response status:', response.status);
      
      if (response.ok) {
        const text = await response.text();
        console.log('Raw profile response:', text);
        
        try {
          const data = JSON.parse(text);
          console.log('Parsed profile data:', data);
          if (data.profile) {
            setProfile(data.profile);
            console.log('Profile set:', data.profile);
          }
        } catch (parseError) {
          console.error('JSON parse error for profile:', parseError);
          console.error('Response text that failed to parse:', text);
        }
      } else {
        console.error('Failed to fetch profile, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Network error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const shouldUpdateProgress = (): boolean => {
    if (!profile) {
      console.log('shouldUpdateProgress: No profile');
      return false;
    }
    
    const userProgress = profile.coding_questions_attempted || 0;
    const shouldUpdate = questionId === userProgress + 1;
    
    console.log('Progress check:', {
      questionId,
      currentQuestionId,
      userProgress,
      shouldUpdate,
      calculation: `${questionId} === ${userProgress} + 1`
    });
    
    // Only update if current question is exactly one more than user's progress
    // This ensures sequential progression
    return shouldUpdate;
  };

  const updateCodingProgress = async () => {
    console.log('updateCodingProgress called');
    
    if (!profile) {
      console.log('No profile available');
      return;
    }
    
    const shouldUpdate = shouldUpdateProgress();
    if (!shouldUpdate) {
      console.log('No update needed:', { 
        hasProfile: !!profile, 
        shouldUpdate,
        questionId,
        currentQuestionId,
        userProgress: profile?.coding_questions_attempted || 0
      });
      return;
    }
    
    try {
      console.log('Making API call to update progress...');
      const response = await fetch('/api/update/coding-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const text = await response.text();
        console.log('Raw API response:', text);
        
        try {
          const data = JSON.parse(text);
          console.log('Progress update response:', data);
          
          if (data.success) {
            // Update local profile state
            setProfile(prev => prev ? {
              ...prev,
              coding_questions_attempted: data.new_count
            } : null);
            console.log('Successfully updated coding progress to:', data.new_count);
          }
        } catch (parseError) {
          console.error('JSON parse error for progress update:', parseError);
          console.error('Response text that failed to parse:', text);
        }
      } else {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
      }
    } catch (error) {
      console.error('Network Error updating coding progress:', error);
    }
  };

  const calculatePoints = (allPassed: boolean, timeRemaining: number): number => {
    if (!allPassed) {
      return 0; // No points if tests don't pass
    }
    // Base points for solving the problem
    let points = 5;
    // Bonus points based on time remaining
    if (timeRemaining > 240) { // More than 4 minutes left
      points += 3; // Fast solver bonus
    } else if (timeRemaining > 180) { // More than 3 minutes left
      points += 2;
    } else if (timeRemaining > 120) { // More than 2 minutes left
      points += 1;
    }
    return points;
  };

  const handleCodeSubmission = async (code: string) => {
    try {
      // Here you would integrate with Piston API or your code execution service
      // For now, we'll simulate the response structure
      
      // Simulate test execution - replace with actual Piston API call
      const mockResults = testCases.map((testCase, index) => ({
        passed: Math.random() > 0.2, // Higher chance of passing for demo
        input: testCase.input,
        expected: testCase.expected_output,
        output: Math.random() > 0.2 ? testCase.expected_output : `Wrong output ${index}` // Mock output
      }));
      
      const allPassed = mockResults.every(result => result.passed);
      const pointsToAward = calculatePoints(allPassed, timeLeft);
      
      if (allPassed && pointsToAward > 0) {
        // Add points for successful submission
        const response = await fetch('/api/add/points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ points: pointsToAward }),
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          
          // Update profile points
          if (data.new_total && profile) {
            setProfile(prev => prev ? {
              ...prev,
              total_points: data.new_total
            } : null);
          }
          
          setShowAnimation(true);
          setTimeout(() => setShowAnimation(false), 2000);
        }
        setSubmissionResult({
          success: true,
          message: `All tests passed! Great job! 🎉 You earned ${pointsToAward} fish!`,
          testResults: mockResults,
          pointsAwarded: pointsToAward
        });
      } else if (allPassed && pointsToAward === 0) {
        setSubmissionResult({
          success: true,
          message: "All tests passed, but time ran out! No fish awarded this time. ⏰",
          testResults: mockResults,
          pointsAwarded: 0
        });
      } else {
        setSubmissionResult({
          success: false,
          message: "Some tests failed. Please review your code and try again.",
          testResults: mockResults,
          pointsAwarded: 0
        });
      }
      
      // Update coding progress only if this is the next question in sequence and tests passed
      if (allPassed) {
        console.log('Tests passed, attempting to update progress...');
        await updateCodingProgress();
      } else {
        console.log('Tests failed, not updating progress');
      }
      
      setShowResult(true);
    } catch (error) {
      console.error('Error submitting code:', error);
      setSubmissionResult({
        success: false,
        message: "An error occurred while submitting your code. Please try again.",
        pointsAwarded: 0
      });
      setShowResult(true);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setSubmissionResult(null);
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-3 px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-pulse">🐾</span>
            <h1 className="text-xl font-light">9lives</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Timer</p>
              <p className={`text-sm font-light ${timeLeft < 60 ? 'text-red-600' : timeLeft < 120 ? 'text-orange-500' : ''}`}>
                {formatTime(timeLeft)} ⏰
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
              <p className="text-sm font-light">
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    {profile?.total_points || 0} 🐟
                    {showAnimation && submissionResult?.pointsAwarded && (
                      <span className="inline-block ml-2">
                        <span className="animate-bounce text-lg text-green-600">+{submissionResult.pointsAwarded}</span>
                        <span className="inline-block animate-bounce ml-1" style={{animationDelay: '0.2s'}}>🐟</span>
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
              <p className="text-sm font-light">
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    {getStreakDisplay(profile?.current_streak || null)} 🔥
                  </>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Language</p>
              <p className="text-sm font-light">{language.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r border-gray-100 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Problem Statement */}
            <div className="border border-gray-100 hover:border-black transition-all duration-300">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">📋</span>
                  <h3 className="font-mono font-medium text-lg">{question}</h3>
                </div>
                <p className="text-gray-700 font-light leading-relaxed mb-4">{explanation}</p>
                
                <div className="space-y-3">
                  <div className="border-l-2 border-gray-100 pl-3">
                    <div className="bg-gray-50 px-2 py-1 font-mono text-xs mb-1 inline-block">
                      Input Format
                    </div>
                    <p className="text-gray-700 font-light text-sm">{inputFormat}</p>
                  </div>
                  <div className="border-l-2 border-gray-100 pl-3">
                    <div className="bg-gray-50 px-2 py-1 font-mono text-xs mb-1 inline-block">
                      Output Format
                    </div>
                    <p className="text-gray-700 font-light text-sm">{outputFormat}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="border border-gray-100 hover:border-black transition-all duration-300">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">🧪</span>
                  <h3 className="font-mono font-medium text-lg">Examples</h3>
                </div>
                
                <div className="space-y-3">
                  {testCases.slice(0, 2).map((testCase, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 p-3">
                      <div className="font-mono font-medium text-sm mb-2">Example {index + 1}:</div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-mono font-medium">Input:</span>
                          <div className="mt-1 bg-white p-2 border border-gray-200 font-mono text-xs">
                            {testCase.input || 'No input'}
                          </div>
                        </div>
                        <div>
                          <span className="font-mono font-medium">Output:</span>
                          <div className="mt-1 bg-white p-2 border border-gray-200 font-mono text-xs">
                            {testCase.expected_output}
                          </div>
                        </div>
                        {testCase.description && (
                          <div>
                            <span className="font-mono font-medium">Explanation:</span>
                            <p className="text-gray-600 text-xs mt-1">{testCase.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Points System Information */}
            <div className="border border-gray-100 hover:border-black transition-all duration-300">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">🏆</span>
                  <h3 className="font-mono font-medium text-lg">Points System</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Base points: 5 🐟 (for correct solution)</p>
                  <p>• Speed bonus: +3 🐟 ({'>'}4 min left) | +2 🐟 ({'>'}3 min) | +1 🐟 ({'>'}2 min)</p>
                  <p>• No points if tests fail or time runs out</p>
                </div>
              </div>
            </div>

            {/* Solution Code - Hidden by default */}
            <div className="border border-gray-100 hover:border-black transition-all duration-300">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💡</span>
                    <h3 className="font-mono font-medium text-lg">Solution Code</h3>
                  </div>
                  <button
                    onClick={() => setShowSolution(!showSolution)}
                    className="px-3 py-1 text-xs border border-gray-200 hover:border-black hover:bg-gray-50 transition-all duration-300 font-mono"
                  >
                    {showSolution ? 'Hide Code' : 'Show Code'}
                  </button>
                </div>
                
                {showSolution && (
                  <div className="bg-gray-50 border border-gray-200 p-4 overflow-x-auto">
                    <pre className="text-sm font-mono leading-relaxed text-gray-800">
                      <code>{completeCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Constraints & Complexity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-100 p-3 text-center hover:border-black transition-all duration-300">
                <div className="text-lg mb-2">⏱️</div>
                <div className="font-mono font-medium text-sm mb-1">Time Complexity</div>
                <div className="text-sm text-gray-700">{timeComplexity}</div>
              </div>
              <div className="border border-gray-100 p-3 text-center hover:border-black transition-all duration-300">
                <div className="text-lg mb-2">💾</div>
                <div className="font-mono font-medium text-sm mb-1">Space Complexity</div>
                <div className="text-sm text-gray-700">{spaceComplexity}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <CodeEditor
          className={className}
          functionName={functionName}
          language={language}
          testCases={testCases}
          inputFormat={inputFormat}
          completeCode={completeCode}
          onSubmit={handleCodeSubmission}
        />
      </div>

      {/* Result Popup */}
      {showResult && submissionResult && (
        <ResultPopup
          result={submissionResult}
          onClose={closeResult}
        />
      )}
    </div>
  );
}