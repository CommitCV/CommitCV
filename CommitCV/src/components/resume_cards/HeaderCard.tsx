import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useState } from 'react';
import { Header } from '@/data/types/Resume';

interface HeaderCardProps {
  header: Header;
  handleUpdate: (path: string, value: string) => void;
}

export default function HeaderCard({ header, handleUpdate }: HeaderCardProps) {
  const [expandedHeader, setExpandedHeader] = useState<boolean>(false);

  const toggleHeaderExpand = () => {
    setExpandedHeader(!expandedHeader);
  };

  return (
    <div className="p-6 rounded-lg shadow-lg bg-gray-100">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Header</h2>
        <button onClick={toggleHeaderExpand} className="p-2">
          {expandedHeader ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {expandedHeader && (
        <div>
          <input
            type="text"
            value={header.name}
            onChange={(e) => handleUpdate('header.name', e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 mb-4"
            placeholder="Enter your name"
          />
          {header.subheaders?.map((subheader, idx) => (
            <div key={idx} className="mb-4">
              <input
                type="text"
                value={subheader.text}
                onChange={(e) =>
                  handleUpdate(`header.subheaders.${idx}.text`, e.target.value)
                }
                className="w-full p-2 rounded-lg border border-gray-300 mb-2"
                placeholder="Enter subheader text"
              />
              <input
                type="text"
                value={subheader.link || ''}
                onChange={(e) =>
                  handleUpdate(`header.subheaders.${idx}.link`, e.target.value)
                }
                className="w-full p-2 rounded-lg border border-gray-300"
                placeholder="Enter URL for link"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}