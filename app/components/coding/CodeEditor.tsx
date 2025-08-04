'use client';

import { useState, useEffect } from 'react';

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

interface CodeEditorProps {
  className: string;
  functionName: string;
  language: string;
  testCases: TestCase[];
  completeCode: string;
  inputFormat: string;
  onSubmit: (code: string) => Promise<void>;
}

// Global cache for the sad cat gif
let globalGifCache: string | null = null;
let isGifLoading = false;
const gifLoadPromises: Promise<string>[] = [];

// Function to load and cache the gif globally
const loadSadCatGifGlobally = async (): Promise<string> => {
  // If already cached, return immediately
  if (globalGifCache) {
    return globalGifCache;
  }

  // If already loading, wait for the existing promise
  if (isGifLoading && gifLoadPromises.length > 0) {
    return gifLoadPromises[gifLoadPromises.length - 1];
  }

  // Start loading
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
            globalGifCache = dataUrl; // Cache globally forever
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

export default function CodeEditor({
  className,
  functionName,
  language,
  testCases,
  completeCode,
  inputFormat,
  onSubmit
}: CodeEditorProps) {
  // Generate initial code template based on language and actual code structure
  const generateInitialCode = () => {
    if (language.toLowerCase() === 'python') {
      return extractPythonTemplate();
    } else if (language.toLowerCase() === 'java') {
      return extractJavaTemplate();
    } else {
      // Default fallback
      return `class ${className} {
    public String ${functionName}(String input) {
        // Your code here
        return "";
    }
}`;
    }
  };

  const extractPythonTemplate = () => {
    const lines = completeCode.split('\n');
    let result = [];
    let inFunction = false;
    let functionIndent = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines at the start
      if (!trimmedLine && result.length === 0) continue;
      
      // Add imports
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
        result.push(line);
        continue;
      }
      
      // Add class definition
      if (trimmedLine.startsWith('class ')) {
        result.push(line);
        continue;
      }
      
      // Handle function definitions
      if (trimmedLine.startsWith('def ')) {
        const functionMatch = trimmedLine.match(/def\s+(\w+)/);
        if (functionMatch) {
          const funcName = functionMatch[1];
          
          // If this is the target function, create empty template
          if (funcName === functionName) {
            result.push(line);
            const indentMatch = line.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            result.push(indent + '    # Your code here');
            result.push(indent + '    pass');
            
            // Skip the actual implementation
            inFunction = true;
            functionIndent = indent.length;
            continue;
          } else {
            // For other functions (like main), include them as-is
            result.push(line);
            inFunction = false;
          }
        }
        continue;
      }
      
      // Skip function body for target function
      if (inFunction) {
        const currentIndentMatch = line.match(/^(\s*)/);
        const currentIndent = currentIndentMatch ? currentIndentMatch[1].length : 0;
        // If we're back to class level or same level as function def, we're done with function
        if (trimmedLine && currentIndent <= functionIndent) {
          inFunction = false;
          result.push(line);
        }
        // Skip lines inside the target function
        continue;
      }
      
      // Add everything else (main function, if __name__ == '__main__', etc.)
      if (trimmedLine) {
        result.push(line);
      }
    }
    
    return result.join('\n');
  };

  const extractJavaTemplate = () => {
    const lines = completeCode.split('\n');
    let result = [];
    let inFunction = false;
    let braceLevel = 0;
    let functionBraceLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines at the start
      if (!trimmedLine && result.length === 0) continue;
      
      // Add imports
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('package ')) {
        result.push(line);
        continue;
      }
      
      // Add class definition
      if (trimmedLine.includes('class ')) {
        result.push(line);
        continue;
      }
      
      // Count braces for nesting level
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      // Handle function definitions
      if (trimmedLine.includes(functionName) && (trimmedLine.includes('public') || trimmedLine.includes('private') || trimmedLine.includes('protected'))) {
        // This is our target function
        const methodSignature = trimmedLine.replace(/\s*\{.*$/, '') + ' {';
        result.push(line.replace(trimmedLine, methodSignature));
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        result.push(indent + '    // Your code here');
        
        // Determine appropriate return statement based on return type
        let returnStatement = 'return "";';
        if (trimmedLine.includes(' int ') || trimmedLine.includes(' Integer ')) {
          returnStatement = 'return 0;';
        } else if (trimmedLine.includes(' boolean ') || trimmedLine.includes(' Boolean ')) {
          returnStatement = 'return false;';
        } else if (trimmedLine.includes(' void ')) {
          returnStatement = '// return; // void method';
        } else if (trimmedLine.includes(' List<') || trimmedLine.includes(' ArrayList<')) {
          returnStatement = 'return new ArrayList<>();';
        } else if (trimmedLine.includes(' String[]')) {
          returnStatement = 'return new String[0];';
        } else if (trimmedLine.includes(' int[]')) {
          returnStatement = 'return new int[0];';
        }
        
        result.push(indent + '    ' + returnStatement);
        result.push(indent + '}');
        
        // Skip the actual implementation
        inFunction = true;
        functionBraceLevel = braceLevel + 1;
        braceLevel += openBraces - closeBraces;
        continue;
      }
      
      // Skip function body for target function
      if (inFunction) {
        braceLevel += openBraces - closeBraces;
        if (braceLevel < functionBraceLevel) {
          inFunction = false;
        } else {
          continue; // Skip lines inside the target function
        }
      }
      
      if (!inFunction) {
        braceLevel += openBraces - closeBraces;
        result.push(line);
      }
    }
    
    return result.join('\n');
  };

  const [code, setCode] = useState(generateInitialCode());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'testcases' | 'results'>('editor');
  const [sadCatGif, setSadCatGif] = useState<string | null>(null);
  const [isGifFromCache, setIsGifFromCache] = useState(false);
  const [allTestsPassed, setAllTestsPassed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Load gif on component mount if already cached
  useEffect(() => {
    if (globalGifCache) {
      setSadCatGif(globalGifCache);
      setIsGifFromCache(true);
    }
  }, []);

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
      setIsGifFromCache(globalGifCache !== null);
    } catch (error) {
      console.error('Failed to load sad cat gif:', error);
    }
  };

  const runTestCases = async () => {
    // Don't run tests if already submitted
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
    let firstError: string | null = null;
    
    try {
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        const executionResponse = await executeCodeWithPiston(code, testCase.input);
        
        if (executionResponse.error) {
          // Only capture the first error encountered
          if (!firstError) {
            firstError = executionResponse.error;
            // Load sad cat gif when we encounter the first error
            await loadSadCatGif();
          }
          
          results.push({
            passed: false,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: '',
            error: firstError === executionResponse.error ? executionResponse.error : 'Same error as above',
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
      
      // Load sad cat gif if any tests failed
      if (!success && !sadCatGif) {
        await loadSadCatGif();
      }
      
      // Update test passing state
      setAllTestsPassed(success);
      
      setExecutionResult({
        success,
        results,
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
    
    setIsSubmitting(true);
    try {
      await onSubmit(code);
      setHasSubmitted(true);
    } catch (error) {
      console.error('Error submitting code:', error);
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

  return (
    <div className="w-1/2 flex flex-col h-full">
      {/* Code Editor Header */}
      <div className="border-b border-gray-100 p-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">👨‍💻</span>
          <h3 className="font-mono font-medium text-lg">Code Editor</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runTestCases}
            disabled={isRunning || !testCases || testCases.length === 0 || hasSubmitted}
            className={`px-4 py-2 transition-all duration-300 font-mono text-sm disabled:cursor-not-allowed ${
              hasSubmitted 
                ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                : isRunning
                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            {isRunning ? 'Running...' : hasSubmitted ? 'Tests Complete' : 'Run Tests'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !allTestsPassed || hasSubmitted}
            className={`px-4 py-2 transition-all duration-300 font-mono text-sm disabled:cursor-not-allowed ${
              hasSubmitted
                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                : allTestsPassed && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : isSubmitting
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}
          >
            {hasSubmitted ? 'Submitted ✓' : isSubmitting ? 'Submitting...' : allTestsPassed ? 'Submit Solution' : 'Run Tests First'}
          </button>
        </div>
      </div>

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
          /* Code Editor Tab */
          <div className="flex-1 p-4 overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full resize-none border border-gray-200 p-4 font-mono text-sm leading-relaxed focus:outline-none focus:border-black transition-colors duration-300"
              placeholder="Write your code here..."
              spellCheck={false}
            />
          </div>
        ) : activeTab === 'testcases' ? (
          /* Test Cases Tab */
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
                
                {testCases && testCases.length > 0 && (
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
          /* Results Tab */
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
                  {/* Big Sad Cat GIF - Only show if there are errors */}
                  {hasErrors && sadCatGif && (
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
                        {executionResult.success ? 'All tests passed! You can now submit.' : 'Some tests failed'}
                      </span>
                    </div>
                    <div className="text-sm font-mono mt-1">
                      {executionResult.results.filter(r => r.passed).length} / {executionResult.results.length} tests passed
                    </div>
                  </div>

                  {/* Show error message only once if there's a global error */}
                  {executionResult.error && (
                    <div className="border-2 border-red-200 bg-red-50">
                      <div className="p-3 flex items-center gap-2">
                        <span>❌</span>
                        <div className="font-mono font-medium text-sm text-red-800">
                          Execution Error
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

                  {/* Individual Results */}
                  {executionResult.results.map((result, index) => (
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
                          <div className="font-mono font-medium text-sm mb-1">
                            {result.error && result.error !== 'Same error as above' ? 'Error:' : 'Actual:'}
                          </div>
                          {result.error && result.error === 'Same error as above' ? (
                            <div className="bg-yellow-50 border border-yellow-200 p-2 font-mono text-xs text-yellow-800 flex items-center gap-2">
                              <span>⚠️</span>
                              <span>Same error as the first failed test case</span>
                            </div>
                          ) : (
                            <div className={`p-2 border font-mono text-xs max-h-16 overflow-y-auto ${
                              result.error 
                                ? 'bg-red-50 border-red-200 text-red-800' 
                                : result.passed 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-red-50 border-red-200'
                            }`}>
                              <pre className="whitespace-pre-wrap break-words">
                                {result.error || result.actual}
                              </pre>
                            </div>
                          )}
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
                    Click "Run Tests" to execute your code against test cases
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