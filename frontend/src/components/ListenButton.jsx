import { useEffect, useState } from 'react'
import { Pause, Volume2 } from 'lucide-react'

/**
 * Reads the Urdu explanation aloud.
 *
 * Many shopkeepers keep a khata confidently — numbers, names, short entries —
 * without reading a paragraph of formal Urdu comfortably. A score explained in
 * writing only is a score explained to the wrong half of the audience.
 *
 * Uses the browser's own speech synthesis, so it costs nothing, needs no
 * network round trip, and the audio never leaves the device. If the device has
 * no Urdu voice installed the button hides itself rather than reading Urdu
 * script in an English voice, which is worse than silence.
 */
function findUrduVoice(voices) {
  return voices.find((voice) => /^ur\b|^ur-/i.test(voice.lang))
    || voices.find((voice) => /urdu/i.test(voice.name))
    || null
}

export default function ListenButton({ text, label = 'Listen' }) {
  const [voice, setVoice] = useState(null)
  const [speaking, setSpeaking] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setChecked(true)
      return undefined
    }

    const synthesis = window.speechSynthesis

    function pickVoice() {
      const voices = synthesis.getVoices()
      // Chrome populates the list asynchronously, so an empty list is not yet an answer.
      if (voices.length === 0) return
      setVoice(findUrduVoice(voices))
      setChecked(true)
    }

    pickVoice()
    synthesis.addEventListener('voiceschanged', pickVoice)

    return () => {
      synthesis.removeEventListener('voiceschanged', pickVoice)
      synthesis.cancel()
    }
  }, [])

  function toggle() {
    const synthesis = window.speechSynthesis
    if (speaking) {
      synthesis.cancel()
      setSpeaking(false)
      return
    }

    synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice?.lang || 'ur-PK'
    // Slightly slower than default: this is money being explained, not a headline.
    utterance.rate = 0.9
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    synthesis.speak(utterance)
    setSpeaking(true)
  }

  if (!checked || !voice || !text) return null

  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 bg-cream px-4 text-xs font-bold text-leaf transition hover:-translate-y-0.5 hover:border-leaf/40"
      onClick={toggle}
      aria-label={speaking ? 'Stop reading aloud' : 'Read this aloud in Urdu'}
    >
      {speaking ? <><Pause size={14} /> Stop</> : <><Volume2 size={14} /> {label}</>}
    </button>
  )
}
