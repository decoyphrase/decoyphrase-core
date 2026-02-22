"use client";

import { useState, useEffect } from "react";
import { FileItem } from "@/lib/types";
import { Loader2, ArrowLeft } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { marked } from "marked";

interface MarkdownEditorProps {
  file: FileItem;
  onUpdate?: (id: string, content: string) => void;
  closeFile?: () => void;
}

export default function MarkdownEditor({
  file,
  closeFile,
}: MarkdownEditorProps) {
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
    ],
    content: "", // Initialize empty, will set in effect
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-zinc dark:prose-invert max-w-none min-h-full p-4 md:p-6 lg:p-8 focus:outline-none text-zinc-900 dark:text-zinc-50",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const text = updatedEditor.getText();
      setCharCount(text.length);
      setWordCount(text.split(/\s+/).filter(Boolean).length);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    console.log(
      `EDITOR_EFFECT: ${file.name} (${file.id}).Content: ${file.content?.length || 0} `,
    );
    if (editor && file.id) {
      const updateContent = async () => {
        const rawContent = file.content || "";
        const htmlContent = await marked.parse(rawContent);
        editor.commands.setContent(htmlContent);

        const text = editor.getText();
        // Defer state updates to avoid lint error about setState in effect
        setTimeout(() => {
          setCharCount(text.length);
          setWordCount(text.split(/\s+/).filter(Boolean).length);
        }, 0);
      };

      updateContent();
    }
  }, [file.id, file.content, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-900">
        <Loader2 size={24} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  if (file.content === undefined && !file.isLocked && file.type === "file") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-50 dark:bg-zinc-900 text-zinc-500">
        <Loader2 size={24} className="animate-spin mb-2" />
        <span className="text-xs">Loading content...</span>
        <button
          onClick={closeFile}
          className="mt-4 text-blue-500 hover:underline text-xs"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-900">
      <div className="h-12 md:h-14 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 flex items-center px-4 md:px-6 justify-between flex-shrink-0 safe-top">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <button
            onClick={closeFile}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors p-1 -ml-1 touch-target tap-highlight-transparent flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs md:text-sm text-zinc-900 dark:text-zinc-50 font-mono truncate">
            {file.name}
          </span>
        </div>
        <div className="text-[10px] md:text-xs text-zinc-500 font-mono uppercase tracking-widest bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">
          Read Only
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-900 no-scrollbar">
        <EditorContent editor={editor} className="h-full" />
      </div>

      <div className="min-h-[40px] bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 md:px-6 py-2 text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 flex-shrink-0 safe-bottom">
        <span className="flex items-center gap-2 md:gap-4">
          <span>{charCount} characters</span>
          <span>{wordCount} words</span>
        </span>
        <span className="text-zinc-500 dark:text-zinc-400 italic">
          Viewing mode
        </span>
      </div>
    </div>
  );
}
