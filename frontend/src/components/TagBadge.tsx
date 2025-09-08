import React from "react";

const TagBadge = ({ tag }: { tag: string }) => {
  return (
    <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">{tag}</span>
  );
};

export default TagBadge;
