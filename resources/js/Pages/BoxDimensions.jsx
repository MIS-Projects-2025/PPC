import { useToast } from "@/Hooks/useToast";
import { router, useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { FaPlus } from "react-icons/fa";

const DEPTHS = [
    { value: 2, label: "Full depth" },
    { value: 1, label: "Mini (half depth)" },
];

const fmt = (n) => Number(n).toFixed(1);

function Field({ label, error, children }) {
    return (
        <div className="mb-3">
            <label className="block text-[10px] font-bold tracking-widest uppercase mb-1">
                {label}
            </label>
            {children}
            {error && <p className="text-error text-xs mt-1">{error}</p>}
        </div>
    );
}

export default function BoxDimensionsIndex({ boxes }) {
    const toast = useToast();
    const dialogRef = useRef(null);
    const [editing, setEditing] = useState(null);

    const form = useForm({ name: "", length: "", height: "", depth_units: 2 });

    const openCreate = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        dialogRef.current?.showModal();
    };

    const openEdit = (box) => {
        setEditing(box);
        form.clearErrors();
        form.setData({
            name: box.name,
            length: box.length,
            height: box.height,
            depth_units: box.depth_units,
        });
        dialogRef.current?.showModal();
    };

    const submit = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                dialogRef.current?.close();
                toast.success(`${editing ? "Updated" : "Added"} ${form.data.name}`);
            },
        };

        if (editing) {
            form.patch(route("box-dimensions.update", editing.id), options);
        } else {
            form.post(route("box-dimensions.store"), options);
        }
    };

    const remove = (box) => {
        if (!window.confirm(`Delete ${box.name}?`)) return;

        router.delete(route("box-dimensions.destroy", box.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`Deleted ${box.name}`),
            onError: (errors) =>
                toast.error(Object.values(errors)[0] ?? "Could not delete."),
        });
    };

    return (
        <div className="bg-base-200 w-full p-4">
            <Toaster position="top-left" />

            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-black tracking-tight uppercase">Box dimensions</h1>
                <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                    Add box <FaPlus />
                </button>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-xl overflow-x-auto">
                <table className="table table-sm">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th className="text-right">Length</th>
                            <th className="text-right">Height</th>
                            <th>Depth</th>
                            <th className="text-right">Used by</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {boxes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center opacity-50 py-8">
                                    No boxes yet
                                </td>
                            </tr>
                        )}
                        {boxes.map((box) => (
                            <tr key={box.id} className="hover:bg-base-200">
                                <td className="font-bold">{box.name}</td>
                                <td className="text-right">{fmt(box.length)}</td>
                                <td className="text-right">{fmt(box.height)}</td>
                                <td>{box.is_mini ? "Mini" : "Full"}</td>
                                <td className="text-right">{box.stagings_count}</td>
                                <td className="text-right">
                                    <div className="flex gap-1 justify-end">
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-secondary"
                                            onClick={() => openEdit(box)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-error"
                                            disabled={box.stagings_count > 0}
                                            title={
                                                box.stagings_count > 0
                                                    ? "Used by existing lots"
                                                    : "Delete"
                                            }
                                            onClick={() => remove(box)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <dialog ref={dialogRef} className="modal">
                <div className="modal-box max-w-md">
                    <h3 className="font-bold text-lg mb-4">
                        {editing ? `Edit ${editing.name}` : "Add box"}
                    </h3>

                    <form onSubmit={submit}>
                        <Field label="Name" error={form.errors.name}>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="pizza box big 37 x 7"
                                value={form.data.name}
                                onChange={(e) => form.setData("name", e.target.value)}
                            />
                        </Field>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Field label="Length" error={form.errors.length}>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        className="input w-full"
                                        value={form.data.length}
                                        onChange={(e) => form.setData("length", e.target.value)}
                                    />
                                </Field>
                            </div>
                            <div className="flex-1">
                                <Field label="Height" error={form.errors.height}>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        className="input w-full"
                                        value={form.data.height}
                                        onChange={(e) => form.setData("height", e.target.value)}
                                    />
                                </Field>
                            </div>
                        </div>

                        <Field label="Depth" error={form.errors.depth_units}>
                            <select
                                className="select w-full"
                                value={form.data.depth_units}
                                onChange={(e) => form.setData("depth_units", Number(e.target.value))}
                            >
                                {DEPTHS.map((d) => (
                                    <option key={d.value} value={d.value}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => dialogRef.current?.close()}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={form.processing}>
                                {form.processing ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}