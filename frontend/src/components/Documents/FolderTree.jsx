import { FolderIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import clsx from 'clsx';

function FolderTreeItem({ folder, level = 0, currentFolder, onFolderClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={clsx(
          'flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors',
          currentFolder === folder._id && 'bg-primary-50 text-primary-700',
          level > 0 && `pl-${4 + level * 4}`
        )}
        onClick={() => onFolderClick(folder._id)}
        style={{ paddingLeft: `${16 + level * 16}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mr-1"
          >
            <ChevronRightIcon
              className={clsx(
                'w-4 h-4 transition-transform',
                isExpanded && 'transform rotate-90'
              )}
            />
          </button>
        )}
        <FolderIcon className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: folder.color }} />
        <span className="text-sm font-medium truncate">{folder.name}</span>
        {folder.documentCount > 0 && (
          <span className="ml-auto text-xs text-gray-500">{folder.documentCount}</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child._id}
              folder={child}
              level={level + 1}
              currentFolder={currentFolder}
              onFolderClick={onFolderClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTree({ tree, currentFolder, onFolderClick }) {
  return (
    <div className="py-2">
      <div
        className={clsx(
          'flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors',
          !currentFolder && 'bg-primary-50 text-primary-700'
        )}
        onClick={() => onFolderClick(null)}
      >
        <FolderIcon className="w-5 h-5 mr-2" />
        <span className="text-sm font-medium">Root</span>
      </div>

      {tree.map((folder) => (
        <FolderTreeItem
          key={folder._id}
          folder={folder}
          currentFolder={currentFolder}
          onFolderClick={onFolderClick}
        />
      ))}
    </div>
  );
}
