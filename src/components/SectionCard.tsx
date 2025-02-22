import { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export default function SectionCard() {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="bg-gray-100 shadow-lg rounded-lg p-8">
            <div className="flex justify-between items-center">
                <input
                    id="name"
                    name="name"
                    type="text"
                    value="Section Name"
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />
                <button onClick={toggleExpand} className="focus:outline-none">
                    {isExpanded ? <FaChevronUp/> : <FaChevronDown/>}
                </button>
            </div>
            {isExpanded && (
                <div className="mt-4">
                    <p>Expanded content goes here...</p>
                </div>
            )}
        </div>
    );
}
