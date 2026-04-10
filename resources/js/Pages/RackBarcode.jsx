import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

function SlotBarcode({ value, label }) {
  const ref = useRef();

  useEffect(() => {
    JsBarcode(ref.current, value, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 12,
      margin: 8,
    });
  }, [value]);

  return (
    <div className="flex flex-col items-center border border-gray-300 p-2 rounded w-40">
      <svg ref={ref} />
      <span className="text-xs font-bold mt-1">{label}</span>
    </div>
  );
}

export default function RackBarcode({ racks }) {
  const slots = racks.flatMap(rack =>
    Object.values(rack.shelves).flatMap(shelfSlots => shelfSlots)
  );

  return (
    <div id="print-sheet" className="p-8">
      <button 
        onClick={() => window.print()} 
        className="btn btn-primary mb-6 print:hidden"
      >
        Print Sheet
      </button>

      {/* DONE barcode */}
      <div className="mb-8">
        <h2 className="font-bold mb-3 print:hidden">Control</h2>
        <SlotBarcode value="DONE" label="DONE" />
      </div>

      {/* Slot barcodes grouped by rack */}
      {racks.map(rack => (
        <div key={rack.id} className="mb-8">
          <h2 className="font-bold mb-3">{rack.label}</h2>
          <div className="flex flex-wrap gap-3">
            {Object.values(rack.shelves).flatMap(shelfSlots =>
              shelfSlots.map(slot => (
                <SlotBarcode
                  key={slot.id}
                  value={`SLOT:${slot.id}`}  // encodes the DB id directly
                  label={slot.label}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

RackBarcode.layout = null; // disables global layout for this page
