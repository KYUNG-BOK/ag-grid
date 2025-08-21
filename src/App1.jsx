import React, { useMemo, useRef, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry,
  AllCommunityModule,
  themeAlpine,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

// Q: 기준 금액을 코드 곳곳에서 재사용하려면?
// A: 상수로 빼두면 유지보수가 편하고, 추후 환경설정으로도 전환할 때 용이합니다.
const HIGHLIGHT_PRICE = 100_000_000; // 1억

export default function App() {
  const [rowData, setRowData] = useState([
    { id: 1, make: 'Toyota', model: 'Corolla', price: 35_000 },
    { id: 2, make: 'Ford', model: 'Mondeo', price: 32_000 },
    { id: 3, make: 'Porsche', model: 'Boxster', price: 72_000 },
    { id: 4, make: '오즈코딩', model: 'AI', price: 172_000_000 }, // 강조 대상
  ]);

  const gridRef = useRef(null);
  const getRowId = useCallback((p) => String(p.data.id), []);

  // ✅ 컬럼 정의 (조건부 스타일링 핵심)
  const columnDefs = useMemo(
    () => [
      { field: 'make', headerName: '제조사', filter: true, sortable: true, editable: true },
      { field: 'model', headerName: '모델', sortable: true, editable: true },

      {
        field: 'price',
        headerName: '가격',
        editable: true,
        valueFormatter: (p) => (Number(p.value) || 0).toLocaleString(),

        // ✅ 조건부 클래스
        cellClassRules: {
          'font-semibold text-red-600': (p) =>
            Number(p.value) >= HIGHLIGHT_PRICE,
        },
        // ✅ 조건부 배경
        cellStyle: (p) => {
          const v = Number(p.value) || 0;
          if (v >= HIGHLIGHT_PRICE) {
            return { backgroundColor: 'rgba(255,0,0,0.06)' };
          }
          return null;
        },

        // ✅ 이모지 추가
        cellRenderer: (p) => {
          const v = Number(p.value) || 0;
          const formatted = v.toLocaleString();
          // 기준 넘으면 이모지 붙이기
          return v >= HIGHLIGHT_PRICE ? `💸 ${formatted}` : formatted;
        },

        // ✅ 편집 값 파싱
        valueParser: (p) =>
          Number(String(p.newValue).replace(/[^0-9.-]/g, '')) || 0,
      },
    ],
    []
  );

  // ✅ 전체 행(Row) 강조가 필요할 때 (선택)
  // Q: 가격이 기준 이상이면 “행 전체 배경”을 바꾸고 싶어요.
  // A: rowClassRules를 사용하면 됩니다. (그리드 전체 옵션)
  const rowClassRules = useMemo(
    () => ({
      'bg-red-50': (params) =>
        Number(params.data?.price || 0) >= HIGHLIGHT_PRICE, // Tailwind 예시
    }),
    []
  );

  // ✅ 합계 계산 (원본 데이터 기준)
  const total = useMemo(
    () => rowData.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [rowData]
  );

  // 행 추가/삭제/편집
  const handleAddRow = () => {
    const nextId = (rowData.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1;
    const newRow = { id: nextId, make: 'New', model: 'Model', price: 0 };
    gridRef.current.api.applyTransaction({ add: [newRow], addIndex: 0 });
    setRowData((prev) => [newRow, ...prev]);
  };

  const handleDeleteSelected = () => {
    const selected = gridRef.current.api.getSelectedRows();
    if (!selected.length) return;
    gridRef.current.api.applyTransaction({ remove: selected });
    const ids = new Set(selected.map((r) => r.id));
    setRowData((prev) => prev.filter((r) => !ids.has(r.id)));
  };

  const handleCellValueChanged = useCallback((params) => {
    const updated = params.data;
    setRowData((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...updated } : r))
    );
  }, []);

  return (
    <div className="p-3 space-y-3">
      {/* 버튼 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleAddRow}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          행 추가
        </button>
        <button
          onClick={handleDeleteSelected}
          className="px-3 py-2 rounded bg-rose-600 text-white"
        >
          선택행 삭제
        </button>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          theme={themeAlpine}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true }}
          // Q: 체크박스로 여러 행 선택은 어떻게 하나요?
          // A: rowSelection에서 mode/checkbox 옵션을 설정하면 됩니다.
          rowSelection={{
            mode: 'multiRow',
            checkboxes: true,
            headerCheckbox: true,
            enableClickSelection: false,
          }}
          getRowId={getRowId}
          onCellValueChanged={handleCellValueChanged}
          // ✅ 행 전체 조건부 스타일링 (선택)
          rowClassRules={rowClassRules}
          // ✅ 하단 합계 표시
          pinnedBottomRowData={[{ make: '총합', model: '', price: total }]}
        />
      </div>
    </div>
  );
}
