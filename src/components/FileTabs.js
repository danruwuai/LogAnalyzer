import React, { useRef, useState } from 'react';
import { Icons } from './Icons';

/**
 * FileTabs - Multi-file tab management component
 * Linear/Apple-style tabs: dark background, close button on right, active tab highlighted
 */
export default function FileTabs({ files, activeFileId, onSelectFile, onRemoveFile, onReorderFiles }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const tabsRef = useRef(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (dragIndex === dropIndex) return;
    if (onReorderFiles) {
      onReorderFiles(dragIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (files.length === 0) return null;

  return (
    <div className="file-tabs-container">
      <div className="file-tabs" ref={tabsRef}>
        {files.map((file, index) => {
          const isActive = file.id === activeFileId;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={file.id}
              className={`file-tab ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectFile(file.id)}
              title={file.path}
            >
              {/* Drag handle */}
              <span className="file-tab-grip">
                <Icons.Grip />
              </span>

              {/* File icon */}
              <span className="file-tab-icon">
                <Icons.File />
              </span>

              {/* File name */}
              <span className="file-tab-name">{file.name}</span>

              {/* File size badge (small) */}
              {file.fileSize > 0 && (
                <span className="file-tab-size">
                  {formatTabFileSize(file.fileSize)}
                </span>
              )}

              {/* Close button */}
              <button
                className="file-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFile(file.id);
                }}
                title="关闭"
              >
                <Icons.Close />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTabFileSize(bytes) {
  if (bytes < 1024) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'K';
  return (bytes / 1024 / 1024).toFixed(1) + 'M';
}
