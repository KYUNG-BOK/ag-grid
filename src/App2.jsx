import React, { useMemo, useRef, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ModuleRegistry,
  AllCommunityModule,
  themeAlpine,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

// ── 공통 상수
const HIGHLIGHT_PRICE = 100_000_000; // 1억 이상일 때 강조

// 제조사와 모델 목록 (드롭다운 옵션으로 사용)
const MAKES = ['Toyota', 'Ford', 'Porsche', '현대', '기아', '오즈코딩'];
const MODEL_BY_MAKE = {
  Toyota: ['Corolla', 'Prius', 'Supra'],
  Ford: ['Fiesta', 'Mondeo', 'Focus'],
  Porsche: ['911', 'Boxster', 'Cayman'],
  현대: ['아반떼', '소나타', '그랜저'],
  기아: ['레이', 'K5', 'EV6'],
  오즈코딩: ['AI', 'UI', 'FRONTEND', 'BACKEND', 'FULLSTACK'],
};

export default function App2() {
  const [rowData, setRowData] = useState([
    { id: 1, make: 'Toyota',  model: 'Corolla',  price: 35_000 },
    { id: 2, make: 'Ford',    model: 'Mondeo',   price: 32_000 },
    { id: 3, make: 'Porsche', model: 'Boxster',  price: 72_000 },
    { id: 4, make: '오즈코딩', model: 'AI',       price: 172_000_000 }, // 강조 대상
  ]);

  const gridRef = useRef(null);
  const getRowId = useCallback((p) => String(p.data.id), []);

  // ── 컬럼 정의 (드롭다운 + 조건부 스타일 + 이모지 + 편집 지원)
  const columnDefs = useMemo(() => [
    // 제조사: 고정 드롭다운 목록 제공
    {
      field: 'make',
      headerName: '제조사',
      filter: true,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: MAKES },
    },
    // 모델: 선택한 제조사에 따라 동적으로 목록 변경
    {
      field: 'model',
      headerName: '모델',
      editable: true,
      cellEditorSelector: (params) => {
        const make = params.data?.make;
        const values = MODEL_BY_MAKE[make] ?? [];
        return { component: 'agSelectCellEditor', params: { values } };
      },
    },
    // 가격: 입력/편집 가능 + 숫자 파싱 + 조건부 스타일 + 이모지 표시
    {
      field: 'price',
      headerName: '가격',
      editable: true,
      // 보기 좋게 숫자에 콤마 추가
      valueFormatter: (p) => (Number(p.value) || 0).toLocaleString(),
      // 입력값에서 숫자만 추출해 저장
      valueParser: (p) => Number(String(p.newValue).replace(/[^0-9.-]/g, '')) || 0,
      // 숫자 정렬이 정확히 동작하도록 comparator 지정
      comparator: (a, b) => (Number(a) || 0) - (Number(b) || 0),
      // 조건부 텍스트 스타일 (예: 빨간 글씨 + 굵게)
      cellClassRules: {
        'font-semibold text-red-600': (p) => Number(p.value) >= HIGHLIGHT_PRICE,
      },
      // 조건부 배경색 (은은한 빨강)
      cellStyle: (p) => {
        const v = Number(p.value) || 0;
        return v >= HIGHLIGHT_PRICE ? { backgroundColor: 'rgba(255,0,0,0.06)' } : null;
      },
      // 기준 이상일 때 💸 이모지 표시
      cellRenderer: (p) => {
        const v = Number(p.value) || 0;
        const formatted = v.toLocaleString();
        return v >= HIGHLIGHT_PRICE ? `💸 ${formatted}` : formatted;
      },
    },
  ], []);

  // ── 행 전체 강조: 가격이 기준 이상이면 행 전체 배경색 변경
  const rowClassRules = useMemo(() => ({
    'bg-red-50': (params) => Number(params.data?.price || 0) >= HIGHLIGHT_PRICE,
  }), []);

  // ── 합계 (모든 행 기준)
  const total = useMemo(
    () => rowData.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [rowData]
  );

  // 행 추가
  const handleAddRow = () => {
    const nextId = (rowData.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1;
    const make = MAKES[0];
    const model = MODEL_BY_MAKE[make][0];
    const newRow = { id: nextId, make, model, price: 0 };
    gridRef.current.api.applyTransaction({ add: [newRow], addIndex: 0 });
    setRowData((prev) => [newRow, ...prev]);
  };

  // 선택된 행 삭제
  const handleDeleteSelected = () => {
    const selected = gridRef.current.api.getSelectedRows();
    if (!selected.length) return;
    gridRef.current.api.applyTransaction({ remove: selected });
    const ids = new Set(selected.map((r) => r.id));
    setRowData((prev) => prev.filter((r) => !ids.has(r.id)));
  };

  // ── 셀 값 변경 처리 (제조사 변경 시 모델 자동 초기화 포함)
  const handleCellValueChanged = useCallback((params) => {
    const { colDef, data, node } = params;

    // 제조사가 바뀌면 해당 제조사의 첫 모델로 자동 설정
    if (colDef.field === 'make') {
      const models = MODEL_BY_MAKE[data.make] ?? [];
      const nextModel = models[0] ?? '';
      if (data.model !== nextModel) {
        node.setDataValue('model', nextModel);
        setRowData((prev) => prev.map((r) => (r.id === data.id ? { ...data, model: nextModel } : r)));
        return;
      }
    }

    // 그 외 일반적인 값 변경은 그대로 반영
    setRowData((prev) => prev.map((r) => (r.id === data.id ? { ...data } : r)));
  }, []);

  return (
    <div className="p-3 space-y-3">
      {/* 상단 버튼 영역 */}
      <div className="flex items-center gap-2">
        <button onClick={handleAddRow} className="px-3 py-2 rounded bg-blue-600 text-white">
          행 추가
        </button>
        <button onClick={handleDeleteSelected} className="px-3 py-2 rounded bg-rose-600 text-white">
          선택행 삭제
        </button>
      </div>

      {/* AG Grid 테이블 */}
      <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          theme={themeAlpine}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true }}
          // 셀 클릭 즉시 편집 시작
          singleClickEdit={true}
          // 셀 포커스를 잃으면 편집 종료
          stopEditingWhenCellsLoseFocus={true}
          // 체크박스로 멀티 행 선택 가능
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }}
          getRowId={getRowId}
          onCellValueChanged={handleCellValueChanged}
          rowClassRules={rowClassRules}
          // 하단 합계 고정 행
          pinnedBottomRowData={[{ make: '총합', model: '', price: total }]}
        />
      </div>
    </div>
  );
}
