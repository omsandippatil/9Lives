'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TestCase {
  input: string;
  expected_output: string;
  description: string;
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
  onNext
}: ActualCodingProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [showNavigation, setShowNavigation] = useState(false);
  const router = useRouter();
  const params = useParams();
  const currentId = params.id as string;

  const handleFinish = () => {
    setShowNavigation(true);
  };

  const handlePython = () => {
    router.push(`/coding/${currentId}?lang=python`);
  };

  const handleNextQuestion = () => {
    const nextId = parseInt(currentId) + 1;
    router.push(`/coding/${nextId}`);
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono p-2">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-300 pb-2 mb-4">
          <h1 className="text-lg font-bold">{question}</h1>
          <div className="text-sm text-gray-600 mt-1">
            Language: {language.toUpperCase()} | Coding Practice
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Side - Problem Details */}
          <div className="space-y-4">
            {/* Problem Description */}
            <div className="border border-gray-300 p-3">
              <h2 className="font-bold mb-2">Problem</h2>
              <p className="text-sm text-gray-800 mb-3">{explanation}</p>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-bold">Input Format:</span>
                  <p className="text-gray-800 ml-2">{inputFormat}</p>
                </div>
                <div>
                  <span className="font-bold">Output Format:</span>
                  <p className="text-gray-800 ml-2">{outputFormat}</p>
                </div>
              </div>
            </div>

            {/* Test Cases */}
            <div className="border border-gray-300 p-3">
              <h2 className="font-bold mb-2">Test Cases</h2>
              <div className="space-y-2">
                {testCases.map((testCase, index) => (
                  <div 
                    key={index}
                    onClick={() => setActiveTestCase(index)}
                    className={`p-2 border cursor-pointer text-sm ${
                      activeTestCase === index 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold">Test Case {index + 1}</div>
                    <div className="text-gray-600">{testCase.description}</div>
                  </div>
                ))}
              </div>
              
              {/* Active Test Case Details */}
              {testCases[activeTestCase] && (
                <div className="mt-3 p-2 bg-gray-100 border border-gray-300">
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-bold">Input:</span> 
                      <code className="ml-2 bg-white px-1 border">
                        {testCases[activeTestCase].input || 'No input'}
                      </code>
                    </div>
                    <div>
                      <span className="font-bold">Expected Output:</span> 
                      <code className="ml-2 bg-white px-1 border">
                        {testCases[activeTestCase].expected_output}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Complexity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-300 p-3">
                <h3 className="font-bold mb-1 text-sm">Time Complexity</h3>
                <p className="text-sm text-gray-800">{timeComplexity}</p>
              </div>
              <div className="border border-gray-300 p-3">
                <h3 className="font-bold mb-1 text-sm">Space Complexity</h3>
                <p className="text-sm text-gray-800">{spaceComplexity}</p>
              </div>
            </div>
          </div>

          {/* Right Side - Code Editor Area */}
          <div className="space-y-4">
            {/* Code Template/Solution */}
            <div className="border border-gray-300">
              <div className="border-b border-gray-300 p-2 flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-sm">
                  {showSolution ? 'Solution Code' : 'Code Template'}
                </h2>
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="px-3 py-1 text-xs border border-gray-300 hover:bg-gray-100"
                >
                  {showSolution ? 'Hide Solution' : 'Show Solution'}
                </button>
              </div>
              
              <div className="p-3">
                <pre className="text-xs overflow-x-auto bg-gray-50 p-2 border border-gray-200">
                  <code>
                    {showSolution ? completeCode : `// ${language} template for ${functionName}\n// Implement your solution here\n\nclass ${className} {\n    public ${language === 'java' ? 'String' : 'str'} ${functionName}(${language === 'java' ? 'String input' : 'input'}) {\n        // Your code here\n        return ${language === 'java' ? '""' : '""'};\n    }\n}`}
                  </code>
                </pre>
              </div>
            </div>

            {/* Explanation */}
            {showSolution && (
              <div className="border border-gray-300 p-3">
                <h2 className="font-bold mb-2 text-sm">Solution Explanation</h2>
                <p className="text-sm text-gray-800 leading-relaxed">{explanation}</p>
              </div>
            )}

            {/* Practice Area Placeholder */}
            <div className="border border-gray-300 p-3">
              <h2 className="font-bold mb-2 text-sm">Practice Area</h2>
              <div className="bg-gray-50 border border-gray-200 p-4 min-h-32 text-sm text-gray-500">
                <p>Interactive code editor would go here...</p>
                <p className="mt-2">Features to implement:</p>
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• Syntax highlighting</li>
                  <li>• Code execution</li>
                  <li>• Test case validation</li>
                  <li>• Auto-completion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between items-center">
          <button 
            onClick={onNext}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            ← Back to Theory
          </button>

          <div className="flex items-center space-x-4">
            {!showNavigation && (
              <button 
                onClick={handleFinish}
                className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Finish Coding
              </button>
            )}
            
            {showNavigation && (
              <div className="flex space-x-3">
                {language === 'java' && (
                  <button 
                    onClick={handlePython}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Try Python Version
                  </button>
                )}
                <button 
                  onClick={handleNextQuestion}
                  className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Next Question →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}