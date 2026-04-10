import useBarcodeScanner from "@/Hooks/useBarcodeScanner";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import formatLocalTime from "@/Utils/formatLocalTime";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { create } from "zustand";
import RackManagement from "./Rack";

const RACK_SELECTION_ID = "lots_upstream_rack_selector_modal";


const useLotStore = create((set, get) => ({
  lots: [],
  pendingLotToBeAdded: {},
  slotPendingLot: [],
  rackModalID: null,
  isRackModalOpen: false,
  lastAddedId: null,
  isScanning: false,
  clearCombineScanInput: null,
  clearManualFields: null,
  editingLot: null,
  mode: "receive",
  recentUpdates: {},
  
  setMode: (mode) => set({ mode }),

  resetAll: () => {
    const { clearCombineScanInput, clearManualFields } = get();
    clearCombineScanInput?.();
    clearManualFields?.();
    set({
      mode: "receive",
      slotPendingLot: [],
      pendingLotToBeAdded: {},
      editingLot: null,
      isRackModalOpen: false,
    });
    document.getElementById(RACK_SELECTION_ID).close();
  },

  setEditingLot: (lot) => set({ editingLot: lot }),
  clearEditingLot: () => set({ editingLot: null }),

  registerScanInputClear: (fn) => set({ clearCombineScanInput: fn }),
  registerManualFieldsClear: (fn) => set({ clearManualFields: fn }),

  initialize: (lots) => set({ lots: lots }),

  setRackModalID: (id) => set({ rackModalID: id }),

  handleScanParsed: (parsedData) => {
    set({ 
      pendingLotToBeAdded: parsedData,
      isScanning: true,
      isRackModalOpen: true,
    });
    document.getElementById(RACK_SELECTION_ID).showModal();
    setTimeout(() => set({ isScanning: false }), 200);
  },

  openRackModal: () => {
    set({ isRackModalOpen: true });
    document.getElementById(RACK_SELECTION_ID).showModal();
  },

  addPendingLot: (data) => set({ pendingLotToBeAdded: data }),
  editPendingLot: (key, val) => set((state) => ({ pendingLotToBeAdded: { ...state.pendingLotToBeAdded, [key]: val } })),

  removePendingLot: () => set({ pendingLotToBeAdded: {} }),

  appendSlotPendingLot: (slot) =>
    set((state) => ({
      slotPendingLot: [...state.slotPendingLot, slot],
    })),

  removeSlotPendingLot: (slotId) =>
    set((state) => ({
      slotPendingLot: state.slotPendingLot.filter((s) => s.id !== slotId),
    })),

  toggleSlotPendingLot: (slot) =>
    set((state) => {
      const already = state.slotPendingLot.some((s) => s.id === slot.id);
      return {
        slotPendingLot: already
          ? state.slotPendingLot.filter((s) => s.id !== slot.id)
          : [...state.slotPendingLot, slot],
      };
    }),

  clearSlotPendingLot: () => set({ slotPendingLot: [] }),

  isSlotSelected: (slotId) =>
    get().slotPendingLot.some((s) => s.id === slotId),

  closeRackModal: () => {
    set({ isRackModalOpen: false })
    document.getElementById(RACK_SELECTION_ID).close();
  },
  
  receiveLot: (data) => {
    set((state) => ({
      lots: [{ ...data }, ...state.lots],
      lastAddedId: data.id,
      // isScanning: true,
    }));

    // setTimeout(() => set({ isScanning: false, lastAddedId: null }), 1000);
    setTimeout(() => set({ lastAddedId: null }), 1000);
  },

  removeLot: (id) => set((state) => ({
    lots: state.lots.filter((l) => l.id !== id)
  })),

  startFlash: () => set({ isScanning: true }),
  stopFlash: () => set({ isScanning: false }),

  updateLot: (id, updatedData) => {
    const { editingLot } = get();
    
    let modifierName = updatedData.modified_by?.FIRSTNAME || 'System';
    if (editingLot?.id === id) {
      modifierName = 'You';
    };

    set((state) => ({
      lots: state.lots.map(l => l.id === id ? { ...l, ...updatedData } : l),
      recentUpdates: { ...state.recentUpdates, [id]: modifierName }
    }));

    setTimeout(() => {
      set((state) => {
        const next = { ...state.recentUpdates };
        delete next[id];
        return { recentUpdates: next };
      });
    }, 5000);
  },
}));

useLotStore.getState().setRackModalID(RACK_SELECTION_ID);

const fmtQty = (q) => q >= 1000 ? (q / 1000).toFixed(1) + "k" : String(q);

const FIELDS = [
  { key: "lot_id",    label: "Lot ID",     placeholder: "e.g. BC47629.1" },
  { key: "partname", label: "Part name",  placeholder: "e.g. ADL5561ACPZ-R7" },
  { key: "qty",      label: "Qty",        placeholder: "e.g. 125213" },
];

const EMPTY_FORM = { lot_id: "", partname: "", qty: "" };

function ScanInput({ onParse }) {
  const { startFlash, openRackModal, addPendingLot } = useLotStore();
  const [value, setValue] = useState("");
  const ref = useRef();

  const registerScanInputClear = useLotStore((s) => s.registerScanInputClear);

  useEffect(() => {
    registerScanInputClear(() => setValue(""));
    return () => registerScanInputClear(null);
  }, []);

  const parseBarcode = (raw) => {
    const input = raw.trim();
    
    if (input.includes(';')) {
      const parts = input.split(';');
      if (parts.length >= 4) {
        return {
          lot_id:    parts[0].trim(),
          partname: parts[1].trim(),
          qty:      parts[3].trim(),
        };
      }
    }

    if (input.includes('|')) {
      const parts = input.split('|');
      if (parts.length >= 3) {
        return {
          lot_id:    parts[1].trim(),
          partname: parts[0].trim(),
          qty:      parts[2].trim(),
        };
      }
    }

    return null;
  };

  useBarcodeScanner((v) => {
    setValue(v);
    const parsedData = parseBarcode(v);

    if (!parsedData) {
      return;
    }

    onParse(parsedData);
    useLotStore.getState().handleScanParsed(parsedData);
    // startFlash(true);
    // addPendingLot(parsedData);
    // setTimeout(() => startFlash(false), 200);

    // // setTimeout(() => openRackModal(), 0);
    openRackModal();
  });

  return (
    <div>
      <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1.5">
        QR / Combined scan
      </label>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        // onKeyDown={handleKeyDown}
        placeholder="Scan QR or press Enter after typing"
        autoComplete="off"
        spellCheck="false"
        className="input w-full px-3 py-2.5 text-sm font-semibold border-2 rounded-lg outline-none focus:border-blue-500 transition-colors placeholder:font-normal"
      />
    </div>
  );
}

function ManualFields({ form, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
            {f.label}
          </label>
          <input
            value={form[f.key]}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            autoComplete="off"
            className="input w-full px-2.5 py-2 text-[13px] font-semibold border border-base-300 rounded-md bg-base-200 outline-none focus:border-blue-300 transition-colors placeholder:font-normal"
          />
        </div>
      ))}
    </div>
  );
}

function SlotAssign() {
  const { slotPendingLot, removeSlotPendingLot } = useLotStore();

  return (
    <div className="mb-5 py-2">
      <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1.5">
        Rack slots
      </label>
      <div className="p-2 bg-base-200 border border-base-content/20 rounded-lg min-h-20 max-h-40 overflow-y-auto gap-2 flex flex-wrap">
        {slotPendingLot.length === 0 && (
          <div className="flex gap-2 w-full justify-center items-center opacity-50">
            None assigned
          </div>
        )}
        {slotPendingLot.map((s, i) => (
          <div key={i} className="flex gap-2">
            {s && (
              <button onClick={() => removeSlotPendingLot(s.id)} className="btn w-30 btn-ghost group relative flex items-center gap-2 overflow-hidden px-4 py-2 hover:border hover:border-rose-500 hover:text-rose-500">
                <span>{s?.label}</span>
                <span className="scale-0 opacity-0 transition-all duration-100 group-hover:max-w-[50px] group-hover:scale-100 group-hover:text-rose-500 group-hover:opacity-100">
                  remove
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanPanel({ onConfirm, onUpdate, initialForm = EMPTY_FORM }) {
  const { registerManualFieldsClear, editPendingLot, slotPendingLot, mode, editingLot } = useLotStore();
  const [form, setForm]   = useState(EMPTY_FORM);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    registerManualFieldsClear(() => setForm(EMPTY_FORM));
    return () => registerManualFieldsClear(null);
  }, []);

  const handleParse = (parsed) => {
    setForm(parsed);
  };

  const handleChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    editPendingLot(key, val);
  };

  const canConfirm = form.lot_id.trim() && slotPendingLot.length > 0;

  const handleConfirm = () => {
    if (!form.lot_id.trim()) { return; }
    if (slotPendingLot.length === 0) { return; }

    if (mode === "edit") {
      onUpdate?.({ 
        ...form, 
        qty: parseInt(form.qty) || 0,
        slot_ids: slotPendingLot.map(s => s.id)
      });
    } else {
      onConfirm({
        ...form,
        qty: parseInt(form.qty) || 0,
        slot_ids: slotPendingLot.map((s) => s.id),
      });    
    }

    setForm(EMPTY_FORM);
  };

  const handleClear = () => {
    setForm(EMPTY_FORM);
  };

  const hasData = Object.values(form).some((v) => v.trim());
  const isEdit = mode === "edit";

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[13px] font-bold tracking-wide">{isEdit ? `Edit lot: ${editingLot?.lot_id}` : "Scan lot"}</h2>
          {!isEdit && <p className="text-[11px] text-base-content mt-0.5">Scan QR or fill fields manually</p>}
        </div>
        {hasData && (
          <button
            onClick={handleClear}
            className="text-[11px] text-base-content hover:text-red-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {!isEdit && <ScanInput onParse={handleParse} />}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-px bg-base-200" />
        <div className="flex-1 h-px bg-base-200" />
      </div>

      <ManualFields form={form} onChange={handleChange} />

      <SlotAssign />

      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="btn btn-primary mt-auto self-end w-full text-[12px] font-bold rounded-lg bg-base-200 text-base-content hover:bg-base-200 disabled:opacity-25 disabled:cursor-not-allowed transition-all tracking-wide"
      >
        {isEdit ? "Save changes" : "Confirm receive"} <kbd>↵</kbd>
      </button>
    </div>
  );
}

function ReceivedList({ slots, onEdit }) {
  const { lots, lastAddedId, recentUpdates } = useLotStore();

  const [search, setSearch] = useState("");
  const filtered = lots.filter((l) =>
    !search ||
    l.lot_id.toLowerCase().includes(search.toLowerCase()) ||
    l.partname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-base-100 border shadow-md border-base-300 rounded-xl overflow-hidden flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 border-b border-base-300">
        <div>
          <h2 className="text-[13px] font-bold tracking-wide">Received today</h2>
          <p className="text-[11px] text-base-content mt-0.5">{lots.length} lots</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="input px-2.5 py-1.5 text-[12px] border border-base-300 rounded-md bg-base-200 outline-none focus:border-blue-300 w-36 transition-colors"
        />
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[12px] text-base-content">
            No lots found
          </div>
        ) : (
          filtered.map((lot, idx) => {
            const modifierFirstName = recentUpdates[lot.id];

            return(<div
              key={lot.id}
              className={clsx(
                "relative flex items-start justify-between px-4 py-3 gap-3 border-b border-base-300 last:border-none hover:bg-base-200 transition-colors",
                modifierFirstName ? "animate-updated" : "",
                lot.id === lastAddedId && "animate-new-item"
              )}
            >
              {modifierFirstName && (
                <div className="absolute right-1 bottom-1 text-sm">
                  {modifierFirstName} updated this
                </div>
              )}

              <div className="flex items-start gap-3 min-w-0">
                <span className="text-[10px] font-bold text-base-content w-5 pt-0.5 flex-shrink-0">
                  {filtered.length - idx}
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold truncate">{lot.lot_id}</p>
                  <p className="text-[11px] text-base-content truncate">{lot.partname}</p>
                  <div className="flex gap-1.5 flex-wrap mt-1.5 items-center">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-base-200 text-base-content border border-base-300">
                      {fmtQty(lot.qty)} units
                    </span>
                    {lot.slot_ids.map((s) => {
                      return (<span
                        key={s}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-base-100 text-orange-700 border border-orange-500 tracking-wide"
                      >
                        {slots[s]?.label}
                      </span>)
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-[11px] text-base-content font-mono">{formatLocalTime(lot.received_at)}</span>
                <button
                  onClick={() => onEdit(lot)}
                  className="btn btn-ghost text-[10px] font-bold px-2 py-1 rounded border border-base-300 text-base-content hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>)
          })
        )}
      </div>
    </div>
  );
}

export default function LotsUpstream({lots: received, slots, racks}) {
  console.log("🚀 ~ LotsUpstream ~ received:", received)
  const toast = useToast();

  const { initialize, isScanning, updateLot, resetAll, mode, setMode, setEditingLot, editingLot, stopFlash, openRackModal, toggleSlotPendingLot, receiveLot, clearSlotPendingLot, pendingLotToBeAdded, slotPendingLot } = useLotStore();

  useEffect(() => {
    initialize(received.data);
  }, []);

  const handleConfirm = async () => {
    try {
      if (!pendingLotToBeAdded?.lot_id || slotPendingLot.length === 0) return;
      const socketId = window.Echo.socketId();
			let result = await mutateLot(route("lot-upstream.store"),
      {
        method: "POST", 
          body: {
            ...pendingLotToBeAdded,
            slot_ids: slotPendingLot.map((s) => s.id),
          },
          additionalHeaders: {
            "X-Socket-ID": socketId,
          }
        },
			);
      
      console.log("🚀 ~ handleConfirm ~ result:", result)

      toast.success(`You added ${pendingLotToBeAdded?.lot_id} → ${slotPendingLot.map(slot => slot.label).join(", ")}`, { 
        duration: 10000,
        position: "top-center",
      });
      
      receiveLot({
        ...(result?.data || {}),
      });
      resetAll();
		} catch (error) {
			toast.error(error?.message || "Something went wrong");
			console.error(error);
		}
  };

  const handleEdit = (lot) => {
    console.log("🚀 ~ handleEdit ~ lot:", lot)
    setMode("edit");
    setEditingLot(lot);

    clearSlotPendingLot();
    lot.slot_ids.forEach(id => {
      const slot = Object.values(slots).find(s => s.id === id);
      if (slot) toggleSlotPendingLot(slot);
    });

    openRackModal();
  };

  const {
    mutate: mutateLot,
    isLoading: isMutateLotLoading,
    errorMessage: mutateLotErrorMessage,
    errorData: mutateLotErrorData,
    cancel: mutateLotCancel,
  } = useMutation();
  
  const handleUpdate = async (updatedData) => {
    try {
      console.log("🚀 ~ handleUpdate ~ updatedData:", updatedData)
      console.log("🚀 ~ handleUpdate ~ editingLot:", editingLot)
      const url = route("lot-upstream.update", { id: editingLot?.id });
      console.log("🚀 ~ handleUpdate ~ url:", url)
      const socketId = window.Echo.socketId();
			await mutateLot(route("lot-upstream.update", {
					id: editingLot?.id,
				}),
				{
          method: "PATCH", 
          body: updatedData,
          additionalHeaders: {
            "X-Socket-ID": socketId,
          }
        },
			);

      toast.success(`You edited ${updatedData?.lot_id}`, { 
        duration: 10000,
        position: "top-center",
      });
      updateLot(editingLot.id, updatedData);
      resetAll();
		} catch (error) {
			toast.error(error?.message || "Something went wrong");
			console.error(error);
		}
  };

  const handleSelectFromRack = useCallback((slot) => {
    toggleSlotPendingLot(slot)
  }, []);

  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => stopFlash(), 1000);
      return () => clearTimeout(timer);
    }
  }, [isScanning]);

  const selectedSlotIds = useMemo(
    () => new Set(slotPendingLot.map(s => s.id)),
    [slotPendingLot]
  );

  const initialForm = useMemo(() => {
    if (mode === "edit" && editingLot) {
      return {
        lot_id:    editingLot.lot_id,
        partname: editingLot.partname,
        qty:       String(editingLot.qty),
      };
    }
    return EMPTY_FORM;
  }, [mode, editingLot]);

  useEffect(() => {
      const channel = window.Echo.channel('lot-updates');

      channel.listen('LotChanged', (e) => {
          console.log("⚡ Received (Plain):", e);
          const action = e?.action ?? "did something on ";
          const id = e?.id ?? null;
          const data = e?.data ?? null;

          const receivedBy = e?.data?.received_by?.FIRSTNAME ?? "someone";
          const modifiedBy = e?.data?.modified_by?.FIRSTNAME ?? "someone";

          let mutator = "someone";
          if (action === "created") {
            mutator = receivedBy;
            receiveLot({
              ...e.data
            });
          } else if (action === "updated") {
            mutator = modifiedBy;
            updateLot(e.id, e.data);
          }

          if (!id || !data) return;

          toast.info(`${mutator} ${action} ${data?.lot_id}`, { 
            duration: 10000,
            position: "top-center",
          });
      });

      return () => window.Echo.leave('lot-updates');
  }, []);

  return (
    <div className="bg-base-200 p-4 font-mono">
      <dialog id={RACK_SELECTION_ID} className="modal">
        <div className="modal-box w-11/12 border border-base-content/50 max-w-[calc(100vw-4rem)] h-[calc(100vh-4.5rem)] overflow-hidden p-0">
          <div className="flex w-full h-full">
            <div className="w-8/12">
              <RackManagement
                racks={racks}
                selectedSlotIds={selectedSlotIds}
                initialDetailedView={false}
                multiSelect={true}
                disableSideDetailPanel
                onSlotSelect={handleSelectFromRack}
              />
            </div>

            <div className="w-0.5 h-full bg-base-content/25"></div>

            <div className="w-4/12 p-4">
              <ScanPanel
                initialForm={initialForm}
                onConfirm={handleConfirm}
                onUpdate={handleUpdate}
              />
            </div>          

          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      <div className="flex flex-col h-[calc(100vh-9.5rem)] gap-4 overflow-hidden">
        <button className={clsx("btn btn-primary border-2", isScanning ? "border-success shadow-success" : "border-transparent")} onClick={() => openRackModal()}>Add Lot <FaPlus /></button>

        <div className="flex-1 min-w-0 overflow-y-auto">
          <ReceivedList slots={slots} onEdit={handleEdit} />
        </div>
      </div>
    </div>
  );
}