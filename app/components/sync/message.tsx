import React, { useCallback } from 'react'

interface FloatingMessage {
  id: string
  text: string
  x: number
  y: number
  delay: number
  lane: number
}

interface MessageSystemProps {
  showMessageInput: boolean
  messageText: string
  onMessageTextChange: (text: string) => void
  onShowMessageInputChange: (show: boolean) => void
  currentUser: { id: string; email: string } | null
  onSendMessage: (text: string) => void
  floatingMessages: FloatingMessage[]
}

export default function MessageSystem({
  showMessageInput,
  messageText,
  onMessageTextChange,
  onShowMessageInputChange,
  currentUser,
  onSendMessage,
  floatingMessages
}: MessageSystemProps) {

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return
    
    onSendMessage(messageText)
    onMessageTextChange('')
    // Don't hide the message input anymore - keep it open
  }, [messageText, onSendMessage, onMessageTextChange])

  return (
    <div className="fixed bottom-4 right-4 pointer-events-none">
      {/* Message Input */}
      {showMessageInput && (
        <div className="absolute bottom-10 right-0 mb-2 pointer-events-auto">
          <div className="bg-white shadow-lg border-2 border-black p-3">
            <input
              id="cat-triangle-message-input"
              type="text"
              value={messageText}
              onChange={(e) => onMessageTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && messageText.trim()) {
                  e.preventDefault()
                  handleSendMessage()
                } else if (e.key === 'Escape' || e.key === 'Tab') {
                  e.preventDefault()
                  onShowMessageInputChange(false)
                  onMessageTextChange('')
                }
              }}
              placeholder="Type message..."
              className="w-40 px-2 py-2 text-xs border-2 border-black focus:outline-none focus:ring-0 focus:border-black font-medium text-gray-800 bg-white placeholder-gray-500"
              maxLength={50}
              autoFocus
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-700 font-bold">{messageText.length}/50</span>
              <div className="flex gap-1">
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="px-3 py-1 text-xs font-bold bg-black text-white border-2 border-black hover:bg-gray-800 disabled:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    onShowMessageInputChange(false)
                    onMessageTextChange('')
                  }}
                  className="px-2 py-1 text-xs font-bold bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Messages */}
      {floatingMessages.map((message) => (
        <div
          key={message.id}
          className="absolute pointer-events-none text-xs font-black select-none max-w-xs"
          style={{
            left: `${message.x}px`,
            top: `${message.y}px`,
            animationDelay: `${message.delay}ms`,
            animation: 'float-left-text 6s ease-out forwards'
          }}
        >
          <div className="bg-white px-2 py-1 shadow-lg rounded text-gray-800">
            {message.text}
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes float-left-text {
          0% {
            transform: translateX(0) translateY(0) scale(0.9);
            opacity: 0;
          }
          12% {
            transform: translateX(-20px) translateY(-15px) scale(1);
            opacity: 1;
          }
          35% {
            transform: translateX(-50px) translateY(-40px) scale(1);
            opacity: 1;
          }
          65% {
            transform: translateX(-85px) translateY(-70px) scale(1);
            opacity: 0.9;
          }
          85% {
            transform: translateX(-115px) translateY(-95px) scale(0.98);
            opacity: 0.5;
          }
          100% {
            transform: translateX(-150px) translateY(-120px) scale(0.95);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}