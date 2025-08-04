'use client';
import { useState, useEffect } from 'react';
import CodeEditor from './Code';

interface TestCase {
  input: string;
  expected_output: string;
  description: string;
}

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
  description: string;
}

interface ExecutionResult {
  success: boolean;
  results: TestResult[];
  error?: string;
  executionTime?: number;
}

interface CodingInterfaceProps {
  className: string;
  functionName: string;
  language: string;
  testCases: TestCase[];
  completeCode: string;
  inputFormat: string;
  coding_questions_attempted: number; // User's current progress
  questionId: number; // Current question ID
  onSubmit?: (code: string) => Promise<void>; // Made optional since we'll handle it internally
}

// Global cache for the sad cat gif
let globalGifCache: string | undefined = undefined;
let isGifLoading = false;
const gifLoadPromises: Promise<string>[] = [];

const loadSadCatGifGlobally = async (): Promise<string> => {
  if (globalGifCache) {
    return globalGifCache;
  }

  if (isGifLoading && gifLoadPromises.length > 0) {
    return gifLoadPromises[gifLoadPromises.length - 1];
  }

  isGifLoading = true;
  const loadPromise = (async () => {
    try {
      const response = await fetch('https://jfxihkyidrxhdyvdygnt.supabase.co/storage/v1/object/public/gifs//sad.gif');
      if (response.ok) {
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            globalGifCache = dataUrl;
            resolve(dataUrl);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        throw new Error('Failed to fetch gif');
      }
    } catch (error) {
      console.error('Failed to load sad cat gif:', error);
      throw error;
    } finally {
      isGifLoading = false;
    }
  })();

  gifLoadPromises.push(loadPromise);
  return loadPromise;
};

// Function to update coding questions via API
const updateCodingQuestions = async (): Promise<boolean> => {
  try {
    console.log('Calling coding questions update API...');
    
    const response = await fetch('/api/update/coding-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('Coding questions updated successfully:', result.data);
      return true;
    } else {
      console.error('Failed to update coding questions:', result.error);
      console.error('API response:', result);
      return false;
    }
  } catch (error) {
    console.error('Network error while updating coding questions:', error);
    return false;
  }
};

export default function CodingInterface({
  className,
  functionName,
  language,
  testCases,
  completeCode,
  inputFormat,
  coding_questions_attempted,
  questionId,
  onSubmit
}: CodingInterfaceProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'testcases' | 'results'>('editor');
  const [sadCatGif, setSadCatGif] = useState<string | undefined>(undefined);
  const [isGifFromCache, setIsGifFromCache] = useState(false);
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [apiUpdateStatus, setApiUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');

  // Check if user can attempt this question (sequential progression)
  const canAttemptQuestion = () => {
    const shouldAllow = questionId === coding_questions_attempted + 1;
    console.log('Progress check in CodingInterface:', {
      questionId,
      coding_questions_attempted,
      shouldAllow,
      calculation: `${questionId} === ${coding_questions_attempted} + 1`
    });
    return shouldAllow;
  };

  // Check if API should be called (only when questionId is exactly one more than current progress)
  const shouldCallAPI = () => {
    return questionId === coding_questions_attempted + 1;
  };

  useEffect(() => {
    if (globalGifCache) {
      setSadCatGif(globalGifCache);
      setIsGifFromCache(true);
    }
  }, []);

  // Auto-submit when all tests pass (only if user can attempt this question)
  useEffect(() => {
    if (allTestsPassed && !hasSubmitted && !isSubmitting && canAttemptQuestion()) {
      handleSubmit();
    }
  }, [allTestsPassed, hasSubmitted, isSubmitting, coding_questions_attempted, questionId]);

  const executeCodeWithPiston = async (sourceCode: string, testInput: string): Promise<{ output: string; error?: string }> => {
    const pistonLanguage = language.toLowerCase() === 'java' ? 'java' : 'python';
    
    try {
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: pistonLanguage,
          version: '*',
          files: [
            {
              name: pistonLanguage === 'java' ? 'Main.java' : 'main.py',
              content: sourceCode
            }
          ],
          stdin: testInput,
          args: [],
          compile_timeout: 10000,
          run_timeout: 3000,
          compile_memory_limit: -1,
          run_memory_limit: -1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.compile && result.compile.code !== 0) {
        return { output: '', error: result.compile.stderr || result.compile.stdout || 'Compilation failed' };
      }
      
      if (result.run.code !== 0) {
        return { output: result.run.stdout || '', error: result.run.stderr || 'Runtime error' };
      }
      
      return { output: result.run.stdout || '' };
    } catch (error) {
      return { output: '', error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  const loadSadCatGif = async () => {
    try {
      const gifUrl = await loadSadCatGifGlobally();
      setSadCatGif(gifUrl);
      setIsGifFromCache(globalGifCache !== undefined);
    } catch (error) {
      console.error('Failed to load sad cat gif:', error);
    }
  };

  const runTestCases = async () => {
    if (hasSubmitted) return;
    
    if (!testCases || testCases.length === 0) {
      setExecutionResult({ success: false, results: [], error: 'No test cases available' });
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setAllTestsPassed(false);
    
    const startTime = Date.now();
    const results: TestResult[] = [];
    let globalError: string | undefined = undefined;
    
    try {
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        const executionResponse = await executeCodeWithPiston(code, testCase.input);
        
        if (executionResponse.error) {
          if (!globalError) {
            globalError = executionResponse.error;
            await loadSadCatGif();
          }
          
          results.push({
            passed: false,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: '',
            description: testCase.description
          });
        } else {
          const actualOutput = executionResponse.output.trim();
          const expectedOutput = testCase.expected_output.trim();
          const passed = actualOutput === expectedOutput;
          
          results.push({
            passed,
            input: testCase.input,
            expected: expectedOutput,
            actual: actualOutput,
            description: testCase.description
          });
        }
      }
      
      const executionTime = Date.now() - startTime;
      const success = results.every(r => r.passed);
      
      if (!success && !sadCatGif) {
        await loadSadCatGif();
      }
      
      setAllTestsPassed(success);
      
      setExecutionResult({
        success,
        results,
        error: globalError,
        executionTime
      });
      
      setActiveTab('results');
    } catch (error) {
      const errorMessage = `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await loadSadCatGif();
      setAllTestsPassed(false);
      setExecutionResult({
        success: false,
        results: [],
        error: errorMessage
      });
      setActiveTab('results');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !allTestsPassed) return;
    
    // Check if user can attempt this question
    if (!canAttemptQuestion()) {
      console.log('Cannot attempt this question - not in sequence');
      setApiUpdateStatus('error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // First call the original onSubmit if provided
      if (onSubmit) {
        await onSubmit(code);
      }
      
      // Only call API if this is the next question in sequence
      if (shouldCallAPI()) {
        setApiUpdateStatus('updating');
        console.log('Calling API to update progress for question', questionId);
        
        const apiSuccess = await updateCodingQuestions();
        
        if (apiSuccess) {
          setApiUpdateStatus('success');
          console.log('Coding question completed and count updated successfully!');
        } else {
          setApiUpdateStatus('error');
          console.error('Code submitted but failed to update question count');
        }
      } else {
        // If not calling API (e.g., already completed), just mark as success
        console.log('Not calling API - question not in sequence or already completed');
        setApiUpdateStatus('success');
      }
      
      setHasSubmitted(true);
    } catch (error) {
      console.error('Error during submission process:', error);
      setApiUpdateStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResultsTabTitle = () => {
    if (!executionResult) return 'Results';
    const passedCount = executionResult.results.filter(r => r.passed).length;
    const totalCount = executionResult.results.length;
    return `Results (${passedCount}/${totalCount})`;
  };

  const hasErrors = executionResult && (!executionResult.success || executionResult.error);

  const getSubmitButtonText = () => {
    if (!canAttemptQuestion()) {
      return `Complete Question ${coding_questions_attempted + 1} First`;
    }
    
    if (hasSubmitted) {
      switch (apiUpdateStatus) {
        case 'success':
          return 'Completed ✅';
        case 'error':
          return 'Submitted ⚠️';
        default:
          return 'Submitted ✓';
      }
    }
    if (isSubmitting) {
      return apiUpdateStatus === 'updating' ? 'Updating Progress...' : 'Submitting...';
    }
    return allTestsPassed ? 'Submit Solution' : 'Run Tests First';
  };

  const getSubmitButtonClass = () => {
    if (!canAttemptQuestion()) {
      return 'bg-gray-100 text-gray-400 border border-gray-200';
    }
    
    if (hasSubmitted) {
      switch (apiUpdateStatus) {
        case 'success':
          return 'bg-green-600 text-white border border-green-600';
        case 'error':
          return 'bg-orange-500 text-white border border-orange-500';
        default:
          return 'bg-gray-100 text-gray-600 border border-gray-200';
      }
    }
    if (allTestsPassed && !isSubmitting) {
      return 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm';
    }
    if (isSubmitting) {
      return 'bg-blue-500 text-white';
    }
    return 'bg-gray-100 text-gray-400 border border-gray-200';
  };

  const getRunTestsButtonText = () => {
    if (!canAttemptQuestion()) {
      return `Complete Question ${coding_questions_attempted + 1} First`;
    }
    return isRunning ? 'Running...' : hasSubmitted ? 'Tests Complete' : 'Run Tests';
  };

  const getRunTestsButtonClass = () => {
    if (!canAttemptQuestion()) {
      return 'bg-gray-100 text-gray-400 border border-gray-200';
    }
    
    if (hasSubmitted) {
      return 'bg-gray-100 text-gray-500 border border-gray-200';
    }
    if (isRunning) {
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
    return 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400';
  };

  return (
    <div className="w-1/2 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-100 p-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">👨‍💻</span>
          <h3 className="font-mono font-medium text-lg">Code Editor</h3>
          <div className="text-xs text-gray-500 font-mono">
            Question {questionId} | Progress: {coding_questions_attempted}
          </div>
          {apiUpdateStatus === 'success' && (
            <span className="text-green-600 text-sm font-mono">Progress Updated!</span>
          )}
          {apiUpdateStatus === 'error' && (
            <span className="text-orange-500 text-sm font-mono">Progress Update Failed</span>
          )}
          {!canAttemptQuestion() && (
            <span className="text-orange-500 text-sm font-mono">Sequential Progress Required</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={runTestCases}
            disabled={isRunning || !testCases || testCases.length === 0 || hasSubmitted || !canAttemptQuestion()}
            className={`px-4 py-2 transition-all duration-300 font-mono text-sm disabled:cursor-not-allowed ${getRunTestsButtonClass()}`}
          >
            {getRunTestsButtonText()}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !allTestsPassed || hasSubmitted || !canAttemptQuestion()}
            className={`px-4 py-2 transition-all duration-300 font-mono text-sm disabled:cursor-not-allowed ${getSubmitButtonClass()}`}
          >
            {getSubmitButtonText()}
          </button>
        </div>
      </div>

      {/* Sequential Progress Warning */}
      {!canAttemptQuestion() && (
        <div className="bg-orange-50 border border-orange-200 p-3 mx-4 mt-2 rounded">
          <div className="flex items-center gap-2 text-orange-800">
            <span>⚠️</span>
            <span className="font-mono text-sm">
              You must complete questions in order. Current progress: {coding_questions_attempted}, Required: {questionId - 1}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-100 flex-shrink-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 text-sm font-mono transition-all duration-300 ${
              activeTab === 'editor'
                ? 'border-b-2 border-black bg-gray-50'
                : 'hover:bg-gray-50'
            }`}
          >
            Code Editor
          </button>
          <button
            onClick={() => setActiveTab('testcases')}
            className={`px-4 py-2 text-sm font-mono transition-all duration-300 ${
              activeTab === 'testcases'
                ? 'border-b-2 border-black bg-gray-50'
                : 'hover:bg-gray-50'
            }`}
          >
            Test Cases ({testCases?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-sm font-mono transition-all duration-300 ${
              activeTab === 'results'
                ? 'border-b-2 border-black bg-gray-50'
                : 'hover:bg-gray-50'
            } ${executionResult ? '' : 'opacity-50'}`}
          >
            {getResultsTabTitle()}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'editor' ? (
          <CodeEditor
            language={language}
            functionName={functionName}
            completeCode={completeCode}
            onCodeChange={setCode}
          />
        ) : activeTab === 'testcases' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧪</span>
                <h4 className="font-mono font-medium">All Test Cases</h4>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Input format: {inputFormat}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-3">
                {testCases && testCases.length > 0 ? (
                  testCases.map((testCase, index) => (
                    <div key={index} className="border border-gray-200 hover:border-black transition-all duration-300">
                      <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <div className="font-mono font-medium text-sm">Test Case {index + 1}</div>
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <div className="font-mono font-medium text-sm mb-1">Input:</div>
                          <div className="bg-gray-50 p-2 border border-gray-200 font-mono text-xs max-h-20 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words">
                              {testCase.input || 'No input'}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <div className="font-mono font-medium text-sm mb-1">Expected Output:</div>
                          <div className="bg-gray-50 p-2 border border-gray-200 font-mono text-xs max-h-20 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words">
                              {testCase.expected_output}
                            </pre>
                          </div>
                        </div>
                        {testCase.description && (
                          <div>
                            <div className="font-mono font-medium text-sm mb-1">Description:</div>
                            <div className="text-gray-600 text-xs leading-relaxed max-h-16 overflow-y-auto">
                              {testCase.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="font-mono text-sm">No test cases available</div>
                  </div>
                )}
                
                {testCases && testCases.length > 0 && canAttemptQuestion() && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-center">
                    <div className="text-sm text-blue-800 font-mono">
                      💡 Click "Run Tests" to execute your code against all {testCases.length} test cases
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <h4 className="font-mono font-medium">Test Results</h4>
                {executionResult && (
                  <span className="text-xs text-gray-500 font-mono">
                    ({executionResult.executionTime}ms)
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {executionResult ? (
                <div className="space-y-3">
                  {/* Show sad cat and global error if there are errors */}
                  {hasErrors && (
                    <>
                      {sadCatGif && (
                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <img 
                              src={sadCatGif} 
                              alt="Sad cat" 
                              className="w-32 h-32 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-300"
                              title={isGifFromCache ? "Cached" : "Online"}
                            />
                            <div className="absolute -top-2 -right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              {isGifFromCache ? "Cached" : "Online"}
                            </div>
                          </div>
                        </div>
                      )}
                      {executionResult.error && (
                        <div className="border-2 border-red-200 bg-red-50">
                          <div className="p-3 flex items-center gap-2">
                            <span>❌</span>
                            <div className="font-mono font-medium text-sm text-red-800">
                              Error in All Test Cases
                            </div>
                          </div>
                          <div className="p-3 bg-red-50 border-t border-red-200">
                            <div className="font-mono text-xs text-red-800 max-h-32 overflow-y-auto">
                              <pre className="whitespace-pre-wrap break-words">
                                {executionResult.error}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {/* Summary */}
                  <div className={`p-3 border-2 ${
                    executionResult.success 
                      ? 'border-green-200 bg-green-50 text-green-800' 
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {executionResult.success ? '✅' : '❌'}
                      </span>
                      <span className="font-mono font-medium">
                        {executionResult.success 
                          ? (canAttemptQuestion() ? 'All tests passed! Auto-submitting...' : 'All tests passed! (Sequential progress required)')
                          : 'Some tests failed'
                        }
                      </span>
                    </div>
                    <div className="text-sm font-mono mt-1">
                      {executionResult.results.filter(r => r.passed).length} / {executionResult.results.length} tests passed
                    </div>
                  </div>
                  {/* Individual Results - Only show if there's no global error */}
                  {!executionResult.error && executionResult.results.map((result, index) => (
                    <div key={index} className={`border-2 ${
                      result.passed 
                        ? 'border-green-200 hover:border-green-300' 
                        : 'border-red-200 hover:border-red-300'
                    } transition-all duration-300`}>
                      <div className={`p-3 border-b ${
                        result.passed ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span>{result.passed ? '✅' : '❌'}</span>
                          <div className="font-mono font-medium text-sm">
                            Test Case {index + 1}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 space-y-3">
                        <div>
                          <div className="font-mono font-medium text-sm mb-1">Input:</div>
                          <div className="bg-gray-50 p-2 border border-gray-200 font-mono text-xs max-h-16 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words">
                              {result.input || 'No input'}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <div className="font-mono font-medium text-sm mb-1">Expected:</div>
                          <div className="bg-gray-50 p-2 border border-gray-200 font-mono text-xs max-h-16 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words">
                              {result.expected}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <div className="font-mono font-medium text-sm mb-1">Actual:</div>
                          <div className={`p-2 border font-mono text-xs max-h-16 overflow-y-auto ${
                            result.passed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <pre className="whitespace-pre-wrap break-words">
                              {result.actual}
                            </pre>
                          </div>
                        </div>
                        {result.description && (
                          <div>
                            <div className="font-mono font-medium text-sm mb-1">Description:</div>
                            <div className="text-gray-600 text-xs leading-relaxed">
                              {result.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  <div className="text-2xl mb-2">🏃‍♂️</div>
                  <div className="font-mono text-sm">Run your code to see results here</div>
                  <div className="text-xs text-gray-400 mt-2">
                    {canAttemptQuestion() 
                      ? 'Click "Run Tests" to execute your code against test cases'
                      : `Complete question ${coding_questions_attempted + 1} first to run tests`
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}