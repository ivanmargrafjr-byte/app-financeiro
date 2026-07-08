"use client"

import { useState } from "react"
import { MoreVertical, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryForm } from "@/components/forms/CategoryForm"
import { EntityIcon } from "@/components/forms/EntityIcon"
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/hooks/useCategories"
import type { Category, CategoryType } from "@/lib/types"

function CategoryRow({
  category,
  indented,
  onEdit,
  onArchive,
}: {
  category: Category
  indented: boolean
  onEdit: () => void
  onArchive: () => void
}) {
  return (
    <div
      className={
        "border-border flex items-center justify-between rounded-md border px-3 py-2" +
        (indented ? " ml-6" : "")
      }
    >
      <span className="flex items-center gap-2 text-sm">
        <EntityIcon name={category.icon} color={category.color} />
        {category.name}
        {category.isDefault && (
          <Badge variant="secondary" className="text-xs">
            Padrão
          </Badge>
        )}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-7">
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>Arquivar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function CategoryGroup({
  type,
  title,
  categories,
  onEdit,
  onArchive,
}: {
  type: CategoryType
  title: string
  categories: Category[]
  onEdit: (category: Category) => void
  onArchive: (id: string) => void
}) {
  const ofType = categories.filter((c) => c.type === type)
  const topLevel = ofType.filter((c) => c.parentId === null)
  const topLevelIds = new Set(topLevel.map((c) => c.id))
  const orphans = ofType.filter((c) => c.parentId !== null && !topLevelIds.has(c.parentId))

  return (
    <section className="grid gap-2">
      <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
      {topLevel.map((parent) => (
        <div key={parent.id} className="grid gap-2">
          <CategoryRow
            category={parent}
            indented={false}
            onEdit={() => onEdit(parent)}
            onArchive={() => onArchive(parent.id)}
          />
          {ofType
            .filter((c) => c.parentId === parent.id)
            .map((child) => (
              <CategoryRow
                key={child.id}
                category={child}
                indented
                onEdit={() => onEdit(child)}
                onArchive={() => onArchive(child.id)}
              />
            ))}
        </div>
      ))}
      {orphans.map((category) => (
        <CategoryRow
          key={category.id}
          category={category}
          indented={false}
          onEdit={() => onEdit(category)}
          onArchive={() => onArchive(category.id)}
        />
      ))}
    </section>
  )
}

export default function CategoriasPage() {
  const { data: categories, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const archiveCategory = useArchiveCategory()
  const [open, setOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  async function handleCreate(values: Parameters<typeof createCategory.mutateAsync>[0]) {
    try {
      await createCategory.mutateAsync(values)
      toast.success("Categoria criada")
      setOpen(false)
    } catch {
      toast.error("Não foi possível criar a categoria")
    }
  }

  async function handleUpdate(values: Parameters<typeof createCategory.mutateAsync>[0]) {
    if (!editingCategory) return
    try {
      await updateCategory.mutateAsync({ id: editingCategory.id, values })
      toast.success("Categoria atualizada")
      setEditingCategory(null)
    } catch {
      toast.error("Não foi possível atualizar a categoria")
    }
  }

  async function handleArchive(id: string) {
    try {
      await archiveCategory.mutateAsync(id)
      toast.success("Categoria arquivada")
    } catch {
      toast.error("Não foi possível arquivar a categoria")
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nova categoria
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova categoria</DialogTitle>
            </DialogHeader>
            <CategoryForm
              categories={categories ?? []}
              submitLabel="Criar categoria"
              submitting={createCategory.isPending}
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingCategory} onOpenChange={(v) => !v && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              categories={categories ?? []}
              editingId={editingCategory.id}
              defaultValues={{
                name: editingCategory.name,
                type: editingCategory.type,
                icon: editingCategory.icon,
                color: editingCategory.color,
                parentId: editingCategory.parentId,
              }}
              submitLabel="Salvar alterações"
              submitting={updateCategory.isPending}
              onSubmit={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="grid gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-6 sm:grid-cols-2">
          <CategoryGroup
            type="despesa"
            title="Despesas"
            categories={categories ?? []}
            onEdit={setEditingCategory}
            onArchive={handleArchive}
          />
          <CategoryGroup
            type="receita"
            title="Receitas"
            categories={categories ?? []}
            onEdit={setEditingCategory}
            onArchive={handleArchive}
          />
        </div>
      )}
    </div>
  )
}
