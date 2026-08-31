'use client'

import { useState, useEffect } from 'react'

interface TypewriterProps {
  words?: string[]
  text?: string
  typingSpeed?: number
  deletingSpeed?: number
  delayAfterType?: number
  delayAfterDelete?: number
  loop?: boolean
  className?: string
}

export function Typewriter({
  words,
  text,
  typingSpeed = 85,
  deletingSpeed = 45,
  delayAfterType = 2000,
  delayAfterDelete = 350,
  loop = true,
  className = '',
}: TypewriterProps) {
  const wordList = words || (text ? [text] : ['Jeho'])
  const [wordIndex, setWordIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const currentWord = wordList[wordIndex % wordList.length]
  // Find longest word to reserve space and prevent any layout shift/jumping
  const longestWord = wordList.reduce((a, b) => (a.length > b.length ? a : b), '')

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (!isDeleting && displayedText.length < currentWord.length) {
      // Typing forward
      timer = setTimeout(() => {
        setDisplayedText(currentWord.slice(0, displayedText.length + 1))
      }, typingSpeed)
    } else if (!isDeleting && displayedText.length === currentWord.length) {
      // Finished typing current word
      if (loop || wordIndex < wordList.length - 1) {
        timer = setTimeout(() => {
          setIsDeleting(true)
        }, delayAfterType)
      } else {
        setIsComplete(true)
      }
    } else if (isDeleting && displayedText.length > 0) {
      // Deleting backward
      timer = setTimeout(() => {
        setDisplayedText(currentWord.slice(0, displayedText.length - 1))
      }, deletingSpeed)
    } else if (isDeleting && displayedText.length === 0) {
      // Finished deleting word, switch to next word
      timer = setTimeout(() => {
        setIsDeleting(false)
        setWordIndex((prev) => (prev + 1) % wordList.length)
      }, delayAfterDelete)
    }

    return () => clearTimeout(timer)
  }, [displayedText, isDeleting, currentWord, typingSpeed, deletingSpeed, delayAfterType, delayAfterDelete, loop, wordIndex, wordList.length])

  return (
    <span className={`inline-grid grid-cols-1 grid-rows-1 items-center align-middle ${className}`}>
      {/* Invisible anchor word that strictly locks the width & height - zero layout jump */}
      <span className="invisible opacity-0 select-none col-start-1 row-start-1 pointer-events-none whitespace-nowrap" aria-hidden="true">
        {longestWord}
        <span className="inline-block w-[3px]" />
      </span>

      {/* Active typing text in the exact same reserved cell */}
      <span className="col-start-1 row-start-1 inline-flex items-center whitespace-nowrap">
        <span>{displayedText}</span>
        {!isComplete && <span className="typewriter-cursor" aria-hidden="true" />}
      </span>
    </span>
  )
}