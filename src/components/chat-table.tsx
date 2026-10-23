import type {
  CSSProperties,
  JSX,
  ReactNode,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { ExtraProps } from "streamdown";
import { cn } from "@/lib/utils";

// Table cells for assistant replies. Header cells carry a drag handle on their right edge to resize
// the column; widths live only on the rendered table, so they reset when the assistant is reopened.
// Values (numbers, rates, amounts) are centred and text is left-aligned.

const minColumnWidth = 48;
const keyboardStep = 16;

// Fixes every column at its current width so one column can change without the others reflowing.
function freezeColumns(table: HTMLTableElement) {
  if (table.hasAttribute("data-resized")) return;
  const cells = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
  const widths = cells.map((cell) => cell.offsetWidth);
  cells.forEach((cell, i) => {
    cell.style.width = `${widths[i]}px`;
  });
  table.style.tableLayout = "fixed";
  table.style.width = `${widths.reduce((sum, width) => sum + width, 0)}px`;
  table.setAttribute("data-resized", "");
}

const widthOf = (cell: HTMLTableCellElement) => parseFloat(cell.style.width) || cell.offsetWidth;

// Resizing trades width with the column to the right, so the table keeps its width and shape.
// The last column has no neighbour: it can widen the table (which then scrolls) but never make it
// narrower than its container.
function setColumnWidth(cell: HTMLTableCellElement, width: number) {
  const table = cell.closest("table");
  if (!table) return;
  freezeColumns(table);
  const cells = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
  const neighbour = cells[cells.indexOf(cell) + 1];
  const current = widthOf(cell);
  let delta = Math.max(minColumnWidth, Math.round(width)) - current;

  if (neighbour) {
    delta = Math.min(delta, widthOf(neighbour) - minColumnWidth);
    neighbour.style.width = `${widthOf(neighbour) - delta}px`;
  } else {
    const tableWidth = parseFloat(table.style.width);
    const containerWidth = table.parentElement?.clientWidth ?? tableWidth;
    delta = Math.max(delta, Math.min(0, containerWidth - tableWidth));
    table.style.width = `${tableWidth + delta}px`;
  }
  cell.style.width = `${current + delta}px`;
}

function resetColumns(table: HTMLTableElement) {
  table.querySelectorAll<HTMLTableCellElement>("thead th").forEach((cell) => {
    cell.style.removeProperty("width");
  });
  table.style.removeProperty("table-layout");
  table.style.removeProperty("width");
  table.removeAttribute("data-resized");
}

function startResize(event: ReactPointerEvent<HTMLSpanElement>) {
  const cell = event.currentTarget.closest("th");
  if (!cell) return;
  event.preventDefault();
  event.stopPropagation();
  const table = cell.closest("table");
  if (table) freezeColumns(table);
  const startX = event.clientX;
  const startWidth = parseFloat(cell.style.width) || cell.offsetWidth;
  const onMove = (move: PointerEvent) => setColumnWidth(cell, startWidth + move.clientX - startX);
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function resizeWithKeys(event: ReactKeyboardEvent<HTMLSpanElement>) {
  const cell = event.currentTarget.closest("th");
  if (!cell) return;
  const width = parseFloat(cell.style.width) || cell.offsetWidth;
  if (event.key === "ArrowRight") setColumnWidth(cell, width + keyboardStep);
  else if (event.key === "ArrowLeft") setColumnWidth(cell, width - keyboardStep);
  else return;
  event.preventDefault();
}

function resetFromHandle(event: ReactMouseEvent<HTMLSpanElement>) {
  const table = event.currentTarget.closest("table");
  if (table) resetColumns(table);
}

// A number, rate, amount or duration, optionally a pair like "160 / 59", or a dash for no value.
const valuePattern =
  /^(?:[+−-]?\$?[\d.,]+\s?(?:%|k|M|d)?(?:\s*\/\s*[+−-]?\$?[\d.,]+\s?(?:%|k|M|d)?)?|[–—-])$/;

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return "";
}

// Columns marked right-aligned in the markdown hold values.
const isValueColumn = (style: CSSProperties | undefined) =>
  style?.textAlign === "right" || style?.textAlign === "center";

export function ResizableHeaderCell({
  children,
  className,
  style,
  node: _node,
  ...props
}: JSX.IntrinsicElements["th"] & ExtraProps) {
  return (
    <th
      {...props}
      data-streamdown="table-header-cell"
      style={{ ...style, textAlign: isValueColumn(style) ? "center" : "left" }}
      className={cn("relative whitespace-nowrap px-4 py-2 text-sm font-semibold", className)}
    >
      {children}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        title="Drag to resize · double-click to reset"
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={resizeWithKeys}
        onDoubleClick={resetFromHandle}
        className="chat-column-handle"
      />
    </th>
  );
}

export function ChatTableCell({
  children,
  className,
  style,
  node: _node,
  ...props
}: JSX.IntrinsicElements["td"] & ExtraProps) {
  const centred = isValueColumn(style) || valuePattern.test(textOf(children).trim());
  return (
    <td
      {...props}
      data-streamdown="table-cell"
      style={{ ...style, textAlign: centred ? "center" : "left" }}
      className={cn("px-4 py-2 text-sm", className)}
    >
      {children}
    </td>
  );
}
