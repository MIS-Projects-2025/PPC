import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { MdClose } from "react-icons/md";

const SearchInput = React.memo(function SearchInput({
    inputClassName = "ml-auto",
    placeholder = "search",
    initialSearchInput,
    onSearchChange,
    onEnter,
    ...props
}) {
    const [searchInput, setSearchInput] = useState(initialSearchInput);

    useEffect(() => {
        setSearchInput(initialSearchInput);
    }, [initialSearchInput]);

    useEffect(() => {
        if (searchInput === initialSearchInput) {
            return;
        }

        const handler = setTimeout(() => {
            onSearchChange(searchInput);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchInput, onSearchChange, initialSearchInput]);

    const handleClear = () => {
        setSearchInput("");
        onSearchChange("");
        if (onEnter) {
            onEnter({ search: "" });
        }
    };

    return (
        <label className={clsx("input h-7.5", inputClassName)}>
            <FaSearch className="mr-2" />
            <input
                type="text"
                placeholder={placeholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && onEnter) {
                        onEnter({ search: searchInput });
                    }
                }}
                {...props}
            />
            {searchInput && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="ml-2 opacity-50 hover:opacity-100"
                >
                    <MdClose />
                </button>
            )}
        </label>
    );
});

export default SearchInput;
