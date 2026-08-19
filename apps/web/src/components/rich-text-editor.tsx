"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, Link as LinkIcon, UserRound
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  showTokens?: boolean;  // show personalisation token buttons (default true)
}

type FormatCommand =
  | "bold" | "italic" | "underline"
  | "insertUnorderedList" | "insertOrderedList"
  | "justifyLeft" | "justifyCenter";

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your email here…",
  minHeight = 280,
  showTokens = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync external value → DOM only on first mount or when parent resets it
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback((cmd: FormatCommand, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    // Notify parent after command
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertToken = useCallback((token: string) => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, token);
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = window.prompt("Enter URL:", "https://");
    if (url) exec("createLink" as FormatCommand, url);
  }, [exec]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const isEmpty = !value || value === "<br>" || value === "<div><br></div>";

  return (
    <div className="rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
        <ToolbarButton onClick={() => exec("bold")} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} title="Underline (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => exec("justifyLeft")} title="Align left">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("justifyCenter")} title="Align center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={insertLink} title="Insert link">
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>

        {showTokens && (
          <>
            <Divider />
            {/* Personalisation tokens */}
            <span className="text-xs text-muted-foreground pl-1 pr-0.5">Insert:</span>
            {[
              { token: "{{first_name}}", label: "First name",   tip: "Inserts recipient's first name — e.g. \"James\"" },
              { token: "{{name}}",       label: "Full name",    tip: "Inserts recipient's full name — e.g. \"James Carter\"" },
              { token: "{{company}}",    label: "Company",      tip: "Inserts recipient's company name — blank if unknown" },
              { token: "{{email}}",      label: "Email",        tip: "Inserts recipient's email address" },
            ].map(({ token, label, tip }) => (
              <button
                key={token}
                type="button"
                onClick={() => insertToken(token)}
                title={tip}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <UserRound className="w-3 h-3" />
                {label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <p className="absolute top-3 left-3 text-sm text-muted-foreground pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ minHeight }}
          className="px-3 py-3 text-sm outline-none leading-relaxed [&>p]:my-1 [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5"
        />
      </div>

      {/* Hint */}
      {showTokens && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          Tokens are replaced individually per recipient when sent —{" "}
          <span className="font-mono bg-muted px-1 rounded">{"{{first_name}}"}</span>{" "}
          <span className="font-mono bg-muted px-1 rounded">{"{{name}}"}</span>{" "}
          <span className="font-mono bg-muted px-1 rounded">{"{{company}}"}</span>{" "}
          <span className="font-mono bg-muted px-1 rounded">{"{{email}}"}</span>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ onClick, title, children }: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-border mx-1" />;
}
