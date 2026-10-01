"use client"

import { useState } from "react"
import { Pencil, ChevronRight, FolderTree, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CategoryDialog, type CategoryNode } from "@/components/admin/category-dialog"
import { AdminDeleteButton } from "@/components/admin/admin-delete-button"

type Node = CategoryNode & { productCount: number; childCount: number; children: Node[] }

function buildTree(flat: (CategoryNode & { productCount: number; childCount: number })[]): Node[] {
  const map = new Map<string, Node>()
  flat.forEach((f) => map.set(f.id, { ...f, children: [] }))
  const roots: Node[] = []
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRec = (nodes: Node[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

function TreeRow({ node, depth, all }: { node: Node; depth: number; all: CategoryNode[] }) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-md py-2 pr-2 hover:bg-accent/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn("inline-flex size-6 items-center justify-center rounded text-muted-foreground", !hasChildren && "invisible")}
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
        </button>
        <FolderTree className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <span className="font-medium">{node.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">/{node.slug}</span>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {node.productCount} product{node.productCount === 1 ? "" : "s"}
        </span>
        <CategoryDialog
          mode="edit"
          category={node}
          categories={all}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Edit category">
              <Pencil className="size-4" />
            </Button>
          }
        />
        <AdminDeleteButton
          apiPath={`/api/admin/categories/${node.id}`}
          description={`Delete "${node.name}". Only allowed when empty.`}
        />
      </div>
      {hasChildren && open ? (
        <ul>
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} all={all} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function CategoriesManager({
  categories,
}: {
  categories: (CategoryNode & { productCount: number; childCount: number })[]
}) {
  const tree = buildTree(categories)
  const flat: CategoryNode[] = categories

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <CategoryDialog
          mode="create"
          categories={flat}
          trigger={
            <Button>
              <Plus className="size-4" /> New category
            </Button>
          }
        />
      </div>
      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          <FolderTree className="size-6" />
          No categories yet.
        </div>
      ) : (
        <div className="rounded-lg border">
          <ul className="divide-y">
            {tree.map((node) => (
              <TreeRow key={node.id} node={node} depth={0} all={flat} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
