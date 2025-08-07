'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import TheoryComponent from '@/app/components/aptitude/Theory'
import QuestionComponent from '@/app/components/aptitude/Question'

interface TheoryData {
  id: number
  topic_name: string
  definition: string
  terminology: string
  formulas: string
  types: string
  tricks: string
  approach: string
  common_mistakes: string
}

interface QuestionData {
  id: number
  question: string
  formula_or_logic: string
  options: string[]
  explanation: string
  tags: string[]
}

export default function AptitudePage() {
  const params = useParams()
  const id = parseInt(params.id as string)
  
  const [theoryData, setTheoryData] = useState<TheoryData | null>(null)
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [showTheory, setShowTheory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if this ID should show theory first (1, 51, 101, etc.)
  const shouldShowTheory = (id: number) => {
    return id === 1 || (id > 1 && (id - 1) % 50 === 0)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const needsTheory = shouldShowTheory(id)
        
        if (needsTheory) {
          // Calculate topic_id for theory API
          const topicId = Math.floor((id - 1) / 50) + 1
          
          // Fetch theory data
          const theoryResponse = await fetch(`/api/get/aptitude/theory?topic_id=${topicId}`)
          if (!theoryResponse.ok) throw new Error('Failed to fetch theory data')
          const theoryResult = await theoryResponse.json()
          
          if (theoryResult.success && theoryResult.data.length > 0) {
            setTheoryData(theoryResult.data[0])
            setShowTheory(true)
          }
        }
        
        // Fetch question data
        const questionResponse = await fetch(`/api/get/aptitude/question?question_id=${id}`)
        if (!questionResponse.ok) throw new Error('Failed to fetch question data')
        const questionResult = await questionResponse.json()
        
        if (questionResult.success && questionResult.data.length > 0) {
          setQuestionData(questionResult.data[0])
          if (!needsTheory) {
            setShowTheory(false)
          }
        } else {
          throw new Error('Question not found')
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  const handleNextFromTheory = () => {
    setShowTheory(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {showTheory && theoryData ? (
        <TheoryComponent 
          theoryData={theoryData} 
          onNext={handleNextFromTheory}
        />
      ) : questionData ? (
        <QuestionComponent 
          questionData={questionData}
          questionId={id}
        />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">No data available</p>
        </div>
      )}
    </div>
  )
}