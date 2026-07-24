import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { router, usePage } from "@inertiajs/react";
import { useState } from "react";
import { FaSave } from "react-icons/fa";

const PartNameUpsert = () => {
    const toast = useToast();
    const { part } = usePage().props;
    const isEdit = !!part;

    const [devicename, setDevicename] = useState(part?.devicename || "");
    const [focusGroup, setFocusGroup] = useState(part?.focus_grp || "");
    const [factory, setFactory] = useState(part?.areas || "");
    const [pl, setPl] = useState(part?.productline || "PL1");
    const [packageType, setPackageType] = useState(part?.package_type || "");
    const [leadCount, setLeadCount] = useState(part?.lead_count || "");
    const [dimensions, setDimensions] = useState(part?.dimensions || "");
    const [allocation, setAllocation] = useState(part?.allocation || "");
    const [genericName, setGenericName] = useState(part?.generic_name || "");
    const [drypack, setDrypack] = useState(part?.drypack || "");
    const [recipe, setRecipe] = useState(part?.recipe ?? "");

    const {
        mutate,
        isLoading: isMutateLoading,
        errorMessage: mutateErrorMessage,
        cancel: mutateCancel,
    } = useMutation();

    const handleUpsert = async (e) => {
        e.preventDefault();

        const formData = {
            devicename: devicename,
            focus_grp: focusGroup,
            areas: factory,
            productline: pl,
            package_type: packageType,
            lead_count: leadCount,
            dimensions: dimensions,
            allocation: allocation,
            generic_name: genericName,
            drypack: drypack,
            recipe: recipe === "" ? null : Number(recipe),
        };

        const url = isEdit
            ? route("api.partname.update", { id: part.id })
            : route("api.partname.store");

        const method = isEdit ? "PATCH" : "POST";

        try {
            const response = await mutate(url, {
                method,
                body: formData,
            });

            toast.success(
                isEdit
                    ? "Part updated successfully!"
                    : "Part created successfully!",
            );

            router.visit(route("partname.index"));
        } catch (err) {
            console.error("Upsert failed:", err.message);
            toast.error(err.message || "Something went wrong");
        }
    };

    const handleReset = () => {
        setDevicename("");
        setFocusGroup("");
        setFactory("");
        setPl("");
        setPackageType("");
        setLeadCount("");
        setDimensions("");
        setAllocation("");
        setGenericName("");
        setDrypack("");
        setRecipe("");
    };

    return (
        <>
            <h1 className="text-base font-bold">
                {isEdit ? "Edit Part" : "Add New Part"}
            </h1>
            <div>
                <form
                    onSubmit={handleUpsert}
                    className="max-w-lg p-4 space-y-4 rounded-lg"
                    method="POST"
                >
                    {/* Partname */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Partname</legend>
                        <input
                            type="text"
                            className="w-64 input input-bordered"
                            placeholder="Type Partname"
                            value={devicename}
                            onChange={(e) => setDevicename(e.target.value)}
                            required
                        />
                    </fieldset>

                    {/* Focus Group */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Focus Group</legend>
                        <input
                            type="text"
                            className="input input-bordered w-28"
                            placeholder="Type Focus Group"
                            value={focusGroup}
                            onChange={(e) => setFocusGroup(e.target.value)}
                            required
                        />
                        <p className="label">e.g. INT</p>
                    </fieldset>

                    {/* Factory */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Factory</legend>
                        <input
                            type="text"
                            className="w-32 input input-bordered"
                            placeholder="Type Factory"
                            value={factory}
                            onChange={(e) => setFactory(e.target.value)}
                            required
                        />
                        <p className="label">e.g. F1</p>
                    </fieldset>

                    {/* PL */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">PL</legend>
                        <select
                            className="w-20 select select-bordered"
                            value={pl}
                            onChange={(e) => setPl(e.target.value)}
                            required
                        >
                            <option value="PL1">PL1</option>
                            <option value="PL6">PL6</option>
                        </select>
                    </fieldset>

                    {/* Package Name */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">
                            Package Name
                        </legend>
                        <input
                            type="text"
                            className="input input-bordered w-44"
                            placeholder="Type Package Name"
                            value={packageType}
                            onChange={(e) => setPackageType(e.target.value)}
                            required
                        />
                    </fieldset>

                    {/* Lead Count */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Lead Count</legend>
                        <input
                            type="text"
                            className="input input-bordered w-28"
                            placeholder="Lead Count"
                            value={leadCount}
                            onChange={(e) => setLeadCount(e.target.value)}
                            required
                        />
                        <p className="label">e.g. SOIC_N</p>
                    </fieldset>

                    {/* Body Size */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Body Size</legend>
                        <input
                            type="text"
                            className="input input-bordered w-44"
                            placeholder="Type Body Size"
                            value={dimensions}
                            onChange={(e) => setDimensions(e.target.value)}
                            required
                        />
                        <p className="label">e.g. 10X10X2</p>
                    </fieldset>

                    {/* Allocation */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Allocation</legend>
                        <input
                            type="text"
                            className="input input-bordered w-44"
                            placeholder="Type Allocation"
                            value={allocation}
                            onChange={(e) => setAllocation(e.target.value)}
                        />
                    </fieldset>

                    {/* Generic Name */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">
                            Generic Name
                        </legend>
                        <input
                            type="text"
                            className="input input-bordered w-44"
                            placeholder="Type Generic Name"
                            value={genericName}
                            onChange={(e) => setGenericName(e.target.value)}
                        />
                    </fieldset>

                    {/* Drypack */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Drypack</legend>
                        <input
                            type="text"
                            className="input input-bordered w-32"
                            placeholder="Type Drypack"
                            value={drypack}
                            onChange={(e) => setDrypack(e.target.value)}
                        />
                    </fieldset>

                    {/* Recipe */}
                    <fieldset className="fieldset">
                        <legend className="fieldset-legend">Recipe</legend>
                        <input
                            type="number"
                            className="input input-bordered w-28"
                            placeholder="Recipe #"
                            value={recipe}
                            onChange={(e) => setRecipe(e.target.value)}
                        />
                    </fieldset>

                    {/* Buttons */}
                    <div className="flex mt-4 space-x-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn btn-outline btn-error"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isMutateLoading}
                        >
                            {isMutateLoading ? (
                                <span className="loading loading-spinner"></span>
                            ) : (
                                <FaSave />
                            )}
                            {isEdit ? "Edit" : "Add"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default PartNameUpsert;
