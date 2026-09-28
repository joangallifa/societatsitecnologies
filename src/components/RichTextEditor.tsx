import { useEffect, useRef } from "react";
import { htmlToText } from "../lib/richText";

const ACTIONS = [
  { command: "bold", label: "B", title: "Negreta", className: "font-bold" },
  { command: "italic", label: "I", title: "Cursiva", className: "italic" },
  { command: "underline", label: "U", title: "Subratllat", className: "underline" },
  { command: "insertUnorderedList", label: "• Llista", title: "Llista amb pics" },
  { command: "insertOrderedList", label: "1. Llista", title: "Llista numerada" },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-[140px]",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isEmpty = htmlToText(value) === "";

  // Només sincronitzem des de fora quan el contingut difereix, per no
  // moure el cursor a cada pulsació.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  function emit() {
    onChange(ref.current?.innerHTML ?? "");
  }

  function exec(command: string) {
    ref.current?.focus();
    document.execCommand(command, false);
    emit();
  }

  return (
    <div className="rounded-xl border border-slate-300 bg-white shadow-sm transition focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-100">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 px-2 py-1.5">
        {ACTIONS.map((action) => (
          <button
            key={action.command}
            type="button"
            title={action.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(action.command)}
            className={`rounded-md px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100 ${action.className ?? ""}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className={`rich-text ${minHeightClassName} px-4 py-2.5 text-sm text-slate-900 outline-none ${
          isEmpty ? "rich-text-empty" : ""
        }`}
      />
    </div>
  );
}
