/**
 * Documents page — document library with enhanced upload and management.
 */

import DocumentList from '@/components/documents/DocumentList';
import UploadZone from '@/components/documents/UploadZone';
import { useAppStore } from '@/stores/appStore';

export default function DocumentsPage() {
  const uploads = useAppStore((s) => s.uploads);
  const activeUploads = Object.values(uploads).filter(
    (u) => u.status === 'uploading' || u.status === 'processing',
  );

  return (
    <div className="animate-fade-slide-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight font-outfit mb-1">
          Document Library
        </h1>
        <p className="text-[12px] text-serpent-text-muted">
          Upload, index, and manage your knowledge base. Supported formats: PDF, DOCX, TXT, MD, CSV.
        </p>
      </div>

      {/* Upload area */}
      <div className="bg-serpent-surface border border-serpent-border-light rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-serpent-text-secondary">
            Upload Documents
          </h2>
          {activeUploads.length > 0 && (
            <span className="text-[10px] text-[#00d4ff]/80 font-mono">
              {activeUploads.length} uploading...
            </span>
          )}
        </div>
        <UploadZone />
      </div>

      {/* Document list */}
      <div className="bg-serpent-surface border border-serpent-border-light rounded-xl p-6">
        <h2 className="text-[13px] font-medium text-serpent-text-secondary mb-4">
          Indexed Documents
        </h2>
        <DocumentList />
      </div>
    </div>
  );
}
