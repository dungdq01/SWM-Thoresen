import { useState } from 'react'
import { Plus, Edit2, Hash, RefreshCw } from 'lucide-react'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  SearchInput,
  Badge,
} from '@shared/ui'
import { useNumberSequences, SEQUENCE_SCOPE_TYPES, SEQUENCE_RESET_POLICIES } from '@domains/auth'
import { NumberSequenceFormModal } from '@features/settings'
import { SettingsLayout } from './components/SettingsLayout'

export function NumberSequencesPage() {
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState({ open: false, data: null })

  const { data: sequences = [], isLoading } = useNumberSequences()

  const filteredSequences = sequences.filter(
    (seq) =>
      seq.sequenceCode?.toLowerCase().includes(search.toLowerCase()) ||
      seq.description?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => setFormModal({ open: true, data: null })
  const openEditModal = (seq) => setFormModal({ open: true, data: seq })
  const closeFormModal = () => setFormModal({ open: false, data: null })

  const getScopeLabel = (scopeType) => {
    return SEQUENCE_SCOPE_TYPES.find((s) => s.value === scopeType)?.label || scopeType
  }

  const getResetLabel = (resetPolicy) => {
    return SEQUENCE_RESET_POLICIES.find((r) => r.value === resetPolicy)?.label || resetPolicy
  }

  return (
    <SettingsLayout
      title="Number Sequence Management"
      description="Cấu hình quy tắc sinh số tự động cho các loại chứng từ trong hệ thống."
      actions={
        <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
          Create Sequence
        </Button>
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Search by code or description..."
          className="max-w-md"
        />

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Reset</TableHead>
              <TableHead>Number Length</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoading colSpan={8} />
            ) : filteredSequences.length === 0 ? (
              <TableEmpty colSpan={8} message={search ? 'No matching sequences found' : 'No sequences available'} />
            ) : (
              filteredSequences.map((seq) => (
                <TableRow key={seq.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice/15 text-ice-dark">
                        <Hash className="w-4 h-4" />
                      </div>
                      <code className="font-mono font-semibold text-navy-900">
                        {seq.sequenceCode}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-navy-700 line-clamp-1">{seq.description}</span>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-navy-100 px-2 py-1 rounded">
                      {seq.prefixTemplate || '—'}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-navy-600">{seq.formatTemplate}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" size="sm">{getScopeLabel(seq.scopeType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-navy-600">
                      <RefreshCw className="w-3 h-3" />
                      <span className="text-sm">{getResetLabel(seq.resetPolicy)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{seq.runningNoLength}</span>
                  </TableCell>
                  <TableCell align="right">
                    <button
                      onClick={() => openEditModal(seq)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 transition-colors duration-200 hover:bg-moon-50 hover:text-navy-900"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NumberSequenceFormModal
        isOpen={formModal.open}
        onClose={closeFormModal}
        editData={formModal.data}
      />
    </SettingsLayout>
  )
}
