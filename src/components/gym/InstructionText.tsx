import { instructionParts } from "@/lib/exercise-links";

export function InstructionText({ text, className = "" }: { text: string; className?: string }) {
  return <p className={`whitespace-pre-line break-words leading-relaxed ${className}`}>
    {instructionParts(text).map((part, index) => part.href
      ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline underline-offset-2">{part.text}</a>
      : part.text)}
  </p>;
}