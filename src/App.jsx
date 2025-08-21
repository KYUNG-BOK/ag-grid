import React, { useMemo, useRef, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, themeAlpine } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

// Q: 드롭다운 옵션은 왜 컴포넌트 바깥에 두는 이유?
// A: 매번 렌더링할 때 새로 만들 필요가 없는 고정 데이터라서,
//    컴포넌트 바깥에 두면 성능이 좋아지고 코드도 깔끔해집니다.
const MAKES = ["Toyota", "Ford", "Porsche", "현대", "기아", "오즈코딩스쿨","너무어렵다"];
const MODEL_BY_MAKE = {
  Toyota: ["Corolla", "Prius", "Supra"],
  Ford: ["Fiesta", "Mondeo", "Focus"],
  Porsche: ["911", "Boxster", "Cayman"],
  현대: ["아반떼", "소나타", "그랜저"],
  기아: ["레이", "K5", "EV6"],
  너무어렵다: ["깃허브", "aws", "cicd", "BACKEND", "FULLSTACK"],
  오즈코딩스쿨: ["12", "FE", "TSX", "AWS", "GIT FLOW"]
};

export default function App() {
  const [rowData, setRowData] = useState([
    { id: 1, make: "Toyota", model: "Corolla", price: 35000 },
    { id: 2, make: "Ford", model: "Mondeo", price: 32000 },
    { id: 3, make: "Porsche", model: "Boxster", price: 72000 },
    { id: 4, make: "현대", model: "그랜저", price: 42000000 },
  ]);

  const gridRef = useRef(null);

  const getRowId = useCallback((p) => String(p.data.id), []);

  // ✅ 컬럼 정의
  const columnDefs = useMemo(() => [
    {
      field: "make",
      headerName: "제조사",
      editable: true,
      // Q: agSelectCellEditor는 무료에서도 사용할 수 있나요?
      // A: 네. 무료 버전에서도 기본 드롭다운 에디터는 지원됩니다.
      cellEditor: "agSelectCellEditor",
      // Q: 고정된 옵션을 어떻게 넣나요?
      // A: cellEditorParams.values에 배열을 지정하면 됩니다.
      cellEditorParams: { values: MAKES },
      filter: true,
    },
    {
      field: "model",
      headerName: "모델",
      editable: true,
      // Q: cellEditorParams 대신 cellEditorSelector를 쓰는 이유는?
      // A: 행마다 다른 옵션(제조사별 모델)을 보여주려면
      //    cellEditorSelector로 동적으로 값을 지정해야 되요!
      cellEditorSelector: (params) => {
        const make = params.data?.make;
        const values = MODEL_BY_MAKE[make] ?? [];
        return { component: "agSelectCellEditor", params: { values } };
      },
    },
    {
      field: "price",
      headerName: "가격",
      editable: true,
      valueFormatter: (p) => (p.value ?? 0).toLocaleString(),
      valueParser: (p) => Number(String(p.newValue).replace(/[^0-9.-]/g, "")) || 0,
      // Q: 특정 조건에서 색상을 바꿀 수 있나요?
      // A: 넵. cellClassRules를 사용하면 조건부 스타일링이 가능합니다.
      // cellClassRules: { 'text-red-600': (p) => Number(p.value) >= 100000000 }
      // 이 부분은 추후에 다시 다뤄볼 예정이에요!
    },
  ], []);

  //  합계 계산
  // Q: 합계를 필터링된 행 기준으로 계산하려면?
  // A: api.forEachNodeAfterFilterAndSort(...)를 사용해서 표시 중인 행만 합산하면 됩니다.
  const total = useMemo(
    () => rowData.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [rowData]
  );

  //  행 추가
  const handleAddRow = () => {
    // Q: 새 행을 빈 값으로 시작하게 할 수 있나요?
    // A: 가능합니다. model을 ""로 두고 "선택하세요" 같은 옵션을 넣으면 됩니다.
    const nextId = (rowData.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1;
    const make = MAKES[0];
    const model = MODEL_BY_MAKE[make][0];
    const newRow = { id: nextId, make, model, price: 0 };

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

  // ✅ 셀 편집 시 상태 동기화
  const handleCellValueChanged = useCallback((params) => {
    const { colDef, data, node } = params;

// Q: 왜 제조사가 바뀌면 모델을 첫 번째 값으로 바꾸나요?
// A: 제조사와 모델은 '의존 관계'입니다.
//    이전 모델이 새 제조사의 목록에 없을 수 있어 데이터 불일치를 막기 위해,
//    가장 안전한 기본값(해당 제조사의 첫 모델)으로 자동 보정합니다.

if (colDef.field === "make") {
  // 1) 방금 선택된 '제조사(make)'에 해당하는 모델 배열을 가져옵니다.
  //    만약 사전에 정의되지 않은 제조사라면 빈 배열([])을 사용합니다.
  const models = MODEL_BY_MAKE[data.make] ?? [];

  // 2) 그 배열의 첫 번째 항목을 '기본 모델'로 선택합니다.
  //    모델 목록이 비어 있으면 빈 문자열("")을 기본값으로 둡니다.
  const nextModel = models[0] ?? "";

  // 3) 현재 행에 설정되어 있는 model이 기본 모델과 다르면 동기화가 필요합니다.
  if (data.model !== nextModel) {
    // 3-1) 그리드 내부 데이터(해당 RowNode)의 'model' 셀 값을 즉시 갱신합니다.
    //      이 때 AG Grid는 모델 셀에 대해 별도의 'cellValueChanged' 이벤트를 발행할 수 있습니다.
    node.setDataValue("model", nextModel);

    // 3-2) React 상태(rowData)도 동일하게 업데이트합니다.
    //      (같은 id인 행만 찾아서 model을 nextModel로 교체)
    setRowData((prev) =>
      prev.map((r) => (r.id === data.id ? { ...data, model: nextModel } : r))
    );
    return;
  }
}

    // Q: 일반 입력은 어떻게 반영되나요?
    // A: setRowData에서 같은 id를 찾아서 수정된 데이터로 교체합니다.
    setRowData((prev) => prev.map((r) => (r.id === data.id ? { ...data } : r)));
  }, []);

  return (
    <div className="p-3 space-y-3">
      {/* 버튼 */}
      <div className="flex items-center gap-2">
        <button onClick={handleAddRow} className="px-3 py-2 rounded bg-blue-600 text-white">
          행 추가
        </button>
        <button onClick={handleDeleteSelected} className="px-3 py-2 rounded bg-rose-600 text-white">
          선택행 삭제
        </button>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: 500, width: "100%" }}>
        <AgGridReact
          ref={gridRef}
          theme={themeAlpine}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true }}
          rowSelection={{
            mode: "multiRow",
            checkboxes: true,
            headerCheckbox: true,
            enableClickSelection: false,
          }}
          getRowId={getRowId}
          onCellValueChanged={handleCellValueChanged}
          pinnedBottomRowData={[{ make: "총합", model: "", price: total }]}
        />
      </div>
    </div>
  );
}
