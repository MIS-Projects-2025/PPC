import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { PiArrowFatDownFill } from "react-icons/pi";
import { create } from 'zustand';

const useInternalStore = create((set) => ({
  selectedSlot: null,
  isDetailedView: true,
  slotsMap: {},
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  clearSelectedSlot: () => set({ selectedSlot: null }),
  setIsDetailedView: (val) => set({ isDetailedView: val }),
  toggleIsDetailedView: () => set((state) => ({ isDetailedView: !state.isDetailedView })),
}));

export default function RackManagement({
  racks, 
  onSlotSelect, 
  initialDetailedView = true, 
  disableSideDetailPanel = false,
  multiSelect = false,
  selectedSlotIds = new Set(),
}) {
  const [primedVisible, setPrimedVisible] = useState(false);
  const isDetailedView = useInternalStore((state) => state.isDetailedView);

  useEffect(() => {
    const id = requestIdleCallback(() => setPrimedVisible(true), { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }, []);

  useEffect(() => {
    useInternalStore.getState().setIsDetailedView(initialDetailedView);
  }, []);

  const handleChangeDetailView = () => {
    useInternalStore.getState().toggleIsDetailedView();
  }

  return (
    <div className="flex w-full h-full text-base-content overflow-hidden font-sans">
      <main className="flex-1 w-full overflow-y-auto p-4">
        <header className="mb-2">
          <h1 className="text-xl font-black tracking-tight text-base-content uppercase">Lot Inventory</h1>
        </header>

        <div className="flex gap-1 mb-2">
          <div>compact</div>
          <input
            type="checkbox"
            checked={!isDetailedView}
            className="toggle toggle-secondary"
            onChange={handleChangeDetailView}
          />
        </div>

        <div className="grid w-full gap-4">
          {racks.map((rack) => (
            <RackGrid key={rack.id} rack={rack} onSlotSelect={onSlotSelect} multiSelect={multiSelect} selectedSlotIds={selectedSlotIds} forceVisible={primedVisible}/>
          ))}
        </div>
      </main>

      {disableSideDetailPanel || <SlotDetailPanel />}
    </div>
  );
}

function RackGrid({ rack, onSlotSelect, multiSelect, selectedSlotIds, forceVisible  }) {
  const selectedSlot = useInternalStore((state) => state.selectedSlot);
  const isDetailedView = useInternalStore((state) => state.isDetailedView);

  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceVisible) { setVisible(true); return; }
    
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.01 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [forceVisible]);

  const highlightedSlotIds = useMemo(() => {
    if (!selectedSlot) return new Set();
    return new Set(selectedSlot.lots.flatMap(l => l.slot_ids));
  }, [selectedSlot]);

  // useEffect(() => {
  //   const observer = new IntersectionObserver(
  //     ([entry]) => { if (entry.isIntersecting) setVisible(true); },
  //     { threshold: 0.01 }
  //   );
  //   if (ref.current) observer.observe(ref.current);
  //   return () => observer.disconnect();
  // }, []);

  return (
    <section 
      style={{ 
        // contentVisibility: 'auto', 
        containIntrinsicSize: '0 300px'
      }} 
      ref={ref} 
      className="bg-base-100 rounded-lg border border-base-300 relative w-full shadow-xs"
    >
      <h2 className="text-xl w-full font-bold mb-2 flex items-center sticky -top-4 bg-base-100 z-3 p-2 rounded-t-lg shadow-sm">
        {rack.label}
        {Object.entries(rack.shelves).length === 0 && (
          <span className="ml-2 text-sm font-light text-base-content/70">
            empty rack
          </span>
        )}
      </h2>
      
      {/* {visible ?  */}
      (
        <div className="space-y-4 pb-2">
          {Object.entries(rack.shelves).map(([rowLabel, rowSlots]) => (
            <div key={rowLabel} className="flex">
              <div className="flex items-center justify-center font-black text-slate-700 w-6">{rowLabel}</div>
              <div className={clsx(
                "flex-1",
                isDetailedView ? "inline-grid grid-cols-4 lg:grid-cols-8 border-t border-l border-dashed border-base-content/20" : "flex flex-wrap"
              )}>
                {rowSlots.map(slot => {
                  return (
                    <SlotButton 
                      key={slot.id} 
                      slot={slot}
                      isActive={selectedSlot?.id === slot.id}
                      isHighlighted={highlightedSlotIds.has(slot.id)}
                      isSelected={selectedSlotIds.has(slot.id)}
                      multiSelect={multiSelect}
                      onSlotSelect={onSlotSelect}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )
      {/* : (
        <div style={{ height: '200px' }} />
      )} */}
    </section>
  );
}

const SlotButton = React.memo(function SlotButton({ slot, isActive, isHighlighted, multiSelect, onSlotSelect, isSelected }) {
  const setSelectedSlot = useInternalStore((state) => state.setSelectedSlot);
  const isDetailedView = useInternalStore((state) => state.isDetailedView);
  
  const hasLots = slot.lots.length > 0;
  const slotLabel = slot?.label || slot?.meta?.label;
  const isMultiLot = slot.lots.length > 1;
  const isLargeLot = slot.lots.some(l => l.slot_ids?.length > 1);
  const hasExceededAgeThreshold = slot.lots.some(l => l.has_exceeded_age_threshold);
  const isManuallyFull = slot?.is_manually_full === 1;

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);

    if (onSlotSelect) onSlotSelect(slot);
  };

  return (
    <button
      onClick={() => {
        setSelectedSlot(slot); 
        handleSlotClick(slot);
      }}
      className={clsx(
          "btn min-h-12 z-2 border transition-all py-1 flex flex-col items-center justify-center relative group",
          multiSelect && isSelected && 'ring-2 ring-primary animate-pulse',
          "rounded-none -ml-[1px] -mt-[1px]", 
          {
            "bg-rose-500 border-rose-700": isManuallyFull,
            "min-w-15 text-xs font-mono p-0": !isDetailedView,
            "": isHighlighted || hasLots, // Bring active/filled slots to front so their border shows over neighbors
            "font-extrabold border-accent bg-accent/10": isHighlighted, // Highest z-index for highlighted
            "!border-base-content/20": !isHighlighted && !hasLots && !isManuallyFull,
            "border-primary bg-primary/10": !isHighlighted && hasLots && !isLargeLot,
            "border-secondary bg-secondary/20": !isHighlighted && isLargeLot,
            "ring-2 ring-white ring-offset-2 ring-offset-slate-950 animate-pulse": isActive,
          }
      )}
    >
      {multiSelect && (
        <div className="absolute top-0 right-0">
          <input type="checkbox" className='checkbox rounded-none checkbox-sm checkbox-primary' readOnly checked={isSelected} />
        </div>
      )}

      {isActive && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce">
          <PiArrowFatDownFill />
        </div>
      )}

      {hasExceededAgeThreshold && (
        <div className="absolute bottom-0 right-0 animate-status-shift text-yellow-500">
          aged
        </div>
      )}

      <span className={clsx("font-bold text-base-content text-lg", {"text-[9px] absolute top-1 left-1": isDetailedView})}>{slotLabel}</span>
      
      {isDetailedView && (
        isManuallyFull ? (
          <span className="text-[20px] font-black text-base-content uppercase">Full</span>
        ) : hasLots ? (
          <div className="text-center">
            <div className="text-xs font-black text-base-content">
              {isMultiLot ? `${slot.lots.length}` : slot.lots[0].id}
            </div>
            {isLargeLot && (
              <div className="text-[8px] text-indigo-400 font-bold uppercase mt-1">
                Multi-Slot
              </div>
            )}
          </div>
        ) : (
          <span className="text-[9px] bg-stripes font-bold text-base-content uppercase group-hover:text-slate-500">
            Empty
          </span>
        )
      )}
    </button>
  );
});

function SlotDetailPanel({ }) {
  const slot = useInternalStore((state) => state.selectedSlot);
  const clearSelectedSlot = useInternalStore((state) => state.clearSelectedSlot);

  return (
    <>
      <div 
        onClick={clearSelectedSlot}
        className={clsx(
          "fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 z-40",
          slot ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )} 
      />

      <div className={clsx(
        "w-96 h-full fixed right-0 z-50 top-0 flex flex-col bg-base-200 border-l border-base-300/50 transition-all ease-in-out pt-12 pb-16 shadow-2xl animate-in slide-in-from-right duration-300",
        slot ? "w-96 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-10 border-none"
      )}>
        <div className="flex px-4 justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Slot {slot?.label || slot?.meta?.label} Manifest</h3>
          <button onClick={clearSelectedSlot} className="text-slate-500 hover:text-base-content btn btn-ghost"><FaTimes /></button>
        </div>

        <div className="space-y-2 px-4 overflow-y-auto">
          {slot?.lots.length > 0 ? (
            slot?.lots.map(lot => (
              <div key={lot.id} className="relative bg-base-300/50 p-2 rounded-lg border border-base-content/50">
                <div className="flex justify-between mb-2">
                  <span className="text-blue-400 font-black text-sm">{lot.id}</span>
                  <span className="text-[10px] bg-base-400 px-2 py-0.5 rounded-lg text-base-content font-bold uppercase">
                      Qty: {lot.qty}
                  </span>
                </div>
                {lot?.has_exceeded_age_threshold && (
                  <div className="absolute top-1 right-1 animate-status-shift text-yellow-500">
                    aged
                  </div>
                )}
                <p className="text-sm font-medium text-base-content">{lot.part}</p>
                <div className="mt-4 flex gap-1 items-center justify-between">
                  <div className='flex gap-1 items-center'>
                  <span className="text-[10px] text-base-content uppercase font-bold">Occupies:</span>
                  {lot.slot_ids.map(s => (
                    <span key={s} className="text-[12px] bg-accent text-accent-content px-1.5 rounded-sm">
                      {slot?.label}
                    </span>
                  ))}
                  </div>

                  <button className="btn btn-sm btn-error text-white">release</button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-base-content italic">No lots currently assigned.</div>
          )}
        </div>
      </div>
    </>
  );
}