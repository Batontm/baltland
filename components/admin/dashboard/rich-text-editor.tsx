"use client"

import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import { useEffect, useCallback } from "react"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Minus,
    Undo2,
    Redo2,
    Link as LinkIcon,
    Unlink,
    AlignLeft,
    AlignCenter,
    AlignRight,
    ImageIcon,
    Pilcrow,
    RemoveFormatting,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ─── Toolbar Button ────────────────────────────────
function ToolbarButton({
    onClick,
    active,
    disabled,
    title,
    children,
}: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    title: string
    children: React.ReactNode
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
                "h-8 w-8 rounded-md",
                active && "bg-primary/15 text-primary",
            )}
            onClick={onClick}
            disabled={disabled}
            title={title}
        >
            {children}
        </Button>
    )
}

// ─── Toolbar ───────────────────────────────────────
function EditorToolbar({ editor }: { editor: Editor }) {
    const addLink = useCallback(() => {
        const previousUrl = editor.getAttributes("link").href
        const url = window.prompt("Введите URL ссылки:", previousUrl || "https://")
        if (url === null) return // отмена
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
            return
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    }, [editor])

    const addImage = useCallback(() => {
        const url = window.prompt("Введите URL изображения:")
        if (!url) return
        editor.chain().focus().setImage({ src: url }).run()
    }, [editor])

    return (
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
            {/* Отмена/Повтор */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Отменить"
            >
                <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Повторить"
            >
                <Redo2 className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Блочное форматирование */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setParagraph().run()}
                active={editor.isActive("paragraph")}
                title="Обычный текст"
            >
                <Pilcrow className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive("heading", { level: 2 })}
                title="Заголовок H2"
            >
                <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive("heading", { level: 3 })}
                title="Подзаголовок H3"
            >
                <Heading3 className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Текстовое форматирование */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Жирный"
            >
                <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Курсив"
            >
                <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive("underline")}
                title="Подчёркнутый"
            >
                <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive("strike")}
                title="Зачёркнутый"
            >
                <Strikethrough className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Выравнивание */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                active={editor.isActive({ textAlign: "left" })}
                title="По левому краю"
            >
                <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                active={editor.isActive({ textAlign: "center" })}
                title="По центру"
            >
                <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                active={editor.isActive({ textAlign: "right" })}
                title="По правому краю"
            >
                <AlignRight className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Списки */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive("bulletList")}
                title="Маркированный список"
            >
                <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive("orderedList")}
                title="Нумерованный список"
            >
                <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Блочные элементы */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive("blockquote")}
                title="Цитата"
            >
                <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Разделитель"
            >
                <Minus className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Ссылки и изображения */}
            <ToolbarButton
                onClick={addLink}
                active={editor.isActive("link")}
                title="Добавить ссылку"
            >
                <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            {editor.isActive("link") && (
                <ToolbarButton
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    title="Убрать ссылку"
                >
                    <Unlink className="h-4 w-4" />
                </ToolbarButton>
            )}
            <ToolbarButton onClick={addImage} title="Вставить изображение">
                <ImageIcon className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Очистить форматирование */}
            <ToolbarButton
                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                title="Очистить форматирование"
            >
                <RemoveFormatting className="h-4 w-4" />
            </ToolbarButton>
        </div>
    )
}

// ─── Editor Component ──────────────────────────────
interface RichTextEditorProps {
    content: string
    onChange: (html: string) => void
    placeholder?: string
    className?: string
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = "Начните писать статью...",
    className,
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
            }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Placeholder.configure({ placeholder }),
            Image.configure({
                HTMLAttributes: { class: "rounded-lg max-w-full" },
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm sm:prose dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none " +
                    "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 " +
                    "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 " +
                    "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
                    "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic " +
                    "[&_a]:text-primary [&_a]:underline " +
                    "[&_img]:rounded-lg [&_img]:my-4 " +
                    "[&_hr]:my-6 [&_hr]:border-border",
            },
        },
        onUpdate: ({ editor: e }) => {
            onChange(e.getHTML())
        },
        immediatelyRender: false,
    })

    // Синхронизация при внешнем изменении content (переключение между статьями)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, editor])

    if (!editor) return null

    return (
        <div className={cn("rounded-xl border overflow-hidden bg-background", className)}>
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}
