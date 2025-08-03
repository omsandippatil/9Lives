'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Theory from '@/app/components/coding/Theory';
import DragCodeBlocks from '@/app/components/coding/DragCodeBlocks';
import ActualCoding from '@/app/components/coding/ActualCoding';

interface TestCase {
  input: string;
  expected_output: string;
  description: string;
}

interface CodingData {
  id: number;
  sr_no: number;
  question: string;
  approach: string;
  class_name: string;
  function_name: string;
  complete_code: string;
  explanation: string;
  time_complexity: string;
  space_complexity: string;
  input_format: string;
  output_format: string;
  test_cases: string;
}

interface TheoryData {
  id: number;
  sr_no: number;
  question: string;
  approach: string;
  explanation: string;
  approach_details: string;
  pseudo_code: string[];
  syntax_explanation: string | Record<string, string>;
  key_insights: string;
  when_to_use: string;
  time_complexity: string;
  space_complexity: string;
}

interface ApiResponse {
  success: boolean;
  sr_no: number;
  java_code?: CodingData[];
  python_code?: CodingData[];
  java_coding_theory?: TheoryData[];
  python_coding_theory?: TheoryData[];
  found_in_code: boolean;
  found_in_theory: boolean;
  total_records: number;
}

export default function CodingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const lang = searchParams.get('lang') || 'java';
  
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentComponent, setCurrentComponent] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiUrl = `/api/get/coding/${lang}?sr_no=${id}`;
        const response = await fetch(apiUrl);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono">
        <div className="text-black">Error loading data</div>
      </div>
    );
  }

  // Extract data based on language
  const codingData = lang === 'python' ? data.python_code?.[0] : data.java_code?.[0];
  const theoryData = lang === 'python' ? data.python_coding_theory?.[0] : data.java_coding_theory?.[0];

  if (!codingData || !theoryData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono">
        <div className="text-black">No data found</div>
      </div>
    );
  }

  // Parse test cases
  let testCases: TestCase[] = [];
  try {
    testCases = JSON.parse(codingData.test_cases);
  } catch (error) {
    console.error('Error parsing test cases:', error);
  }

  // Parse syntax explanation
  let syntaxExplanation: Record<string, string> = {};
  try {
    if (theoryData.syntax_explanation && typeof theoryData.syntax_explanation === 'string') {
      console.log('Parsing syntax explanation string:', theoryData.syntax_explanation);
      syntaxExplanation = JSON.parse(theoryData.syntax_explanation);
    } else if (theoryData.syntax_explanation && typeof theoryData.syntax_explanation === 'object') {
      console.log('Using syntax explanation object:', theoryData.syntax_explanation);
      syntaxExplanation = theoryData.syntax_explanation;
    }
    console.log('Final syntax explanation:', syntaxExplanation);
  } catch (error) {
    console.error('Error parsing syntax explanation:', error);
    console.log('Raw syntax_explanation:', theoryData.syntax_explanation);
    syntaxExplanation = {};
  }

  // Prepare data for each component
  const theoryProps = {
    question: theoryData.question,
    approach: theoryData.approach,
    explanation: theoryData.explanation,
    approachDetails: theoryData.approach_details,
    syntaxExplanation: syntaxExplanation,
    keyInsights: theoryData.key_insights,
    whenToUse: theoryData.when_to_use,
    timeComplexity: theoryData.time_complexity,
    spaceComplexity: theoryData.space_complexity,
    language: lang
  };

  const dragCodeBlocksProps = {
    question: theoryData.question,
    pseudoCode: theoryData.pseudo_code,
    approach: theoryData.approach,
    language: lang
  };

  const actualCodingProps = {
    question: codingData.question,
    className: codingData.class_name,
    functionName: codingData.function_name,
    completeCode: codingData.complete_code,
    explanation: codingData.explanation,
    timeComplexity: codingData.time_complexity,
    spaceComplexity: codingData.space_complexity,
    inputFormat: codingData.input_format,
    outputFormat: codingData.output_format,
    testCases: testCases,
    language: lang
  };

  const components = [
    <Theory key="theory" {...theoryProps} onNext={() => setCurrentComponent(1)} />,
    <DragCodeBlocks key="drag" {...dragCodeBlocksProps} onNext={() => setCurrentComponent(2)} />,
    <ActualCoding key="coding" {...actualCodingProps} onNext={() => setCurrentComponent(0)} />
  ];

  return (
    <div className="min-h-screen bg-white font-mono">
      {components[currentComponent]}
    </div>
  );
}