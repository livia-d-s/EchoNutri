import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Utensils, Plus, X, Pencil, Check, Repeat, Save, Loader2, Clock, RefreshCw } from 'lucide-react';
import { StructuredMealPlan, StructuredMeal, StructuredMealItem } from '../../../types';

interface MealPlanCardProps {
  plan: StructuredMealPlan;
  onChange: (next: StructuredMealPlan) => void;
  onSavePlan?: () => Promise<void> | void;     // "Salvar como plano ativo"
  saving?: boolean;
  onRecalculateMacros?: () => Promise<void>;
  objective?: string | null;       // e.g. "emagrecimento", "ganho muscular"
  savedSignature?: string | null;  // signature of the most recently saved plan (dedupe)
}

// Compact signature of the meals array — used to detect when macros are stale
// and when the plan differs from what was last saved as active.
export function planSignature(plan: StructuredMealPlan): string {
  return plan.meals
    .map((m) => `${m.name}|${(m.items || []).map((it) => it.food).join('//')}`)
    .join('::');
}

const PLACEHOLDER_FOOD = 'Novo item';
const PLACEHOLDER_MEAL = 'Nova refeição';

// True when any item is still the just-added placeholder. We skip auto-recalc
// in that state because the user hasn't confirmed the real food name yet.
function hasPendingPlaceholder(plan: StructuredMealPlan): boolean {
  return plan.meals.some((m) => {
    if (m.name === PLACEHOLDER_MEAL && (!m.items || m.items.length === 0)) return true;
    return (m.items || []).some((it) => !it.food || it.food.trim() === '' || it.food === PLACEHOLDER_FOOD);
  });
}

export function MealPlanCard({
  plan,
  onChange,
  onSavePlan,
  saving,
  onRecalculateMacros,
  objective,
  savedSignature,
}: MealPlanCardProps) {
  const [recalculating, setRecalculating] = useState(false);
  const [autoRecalcArmed, setAutoRecalcArmed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const baselineRef = useRef<string>(planSignature(plan));
  const debounceRef = useRef<number | null>(null);

  // Reset baseline whenever macros are refreshed (parent updates plan.macroEstimate after recalc/generate).
  const macroId = useMemo(() => JSON.stringify(plan.macroEstimate || null), [plan.macroEstimate]);
  useEffect(() => {
    baselineRef.current = planSignature(plan);
    setAutoRecalcArmed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macroId]);

  const currentSig = planSignature(plan);
  const macrosStale = !!plan.macroEstimate && currentSig !== baselineRef.current;
  const pendingPlaceholder = hasPendingPlaceholder(plan);

  // Auto-recalc: when meals change, debounce 1.5s then recalc automatically.
  // Skip while the user is still entering a placeholder ("Novo item" /
  // "Nova refeição") — we wait until they confirm with a real name.
  useEffect(() => {
    if (!onRecalculateMacros || !macrosStale || recalculating || pendingPlaceholder) {
      // Cancel any armed recalc if we slid back into a placeholder state.
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      setAutoRecalcArmed(false);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setAutoRecalcArmed(true);
    debounceRef.current = window.setTimeout(async () => {
      setAutoRecalcArmed(false);
      setRecalculating(true);
      try {
        await onRecalculateMacros();
      } catch {
        /* parent surfaces the error; keep stale state visible */
      } finally {
        setRecalculating(false);
      }
    }, 1500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSig, macrosStale, pendingPlaceholder]);

  const handleManualRecalc = async () => {
    if (!onRecalculateMacros || recalculating) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setAutoRecalcArmed(false);
    setRecalculating(true);
    try {
      await onRecalculateMacros();
    } finally {
      setRecalculating(false);
    }
  };

  // Save state: dedupe based on signature of the saved plan.
  const isAlreadySaved = !!savedSignature && savedSignature === currentSig;
  const handleSave = async () => {
    if (!onSavePlan || saving || isAlreadySaved) return;
    try {
      await onSavePlan();
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2500);
    } catch {
      /* parent surfaces error */
    }
  };

  const update = (next: StructuredMealPlan) => onChange(next);

  const updateMeal = (mealIdx: number, meal: StructuredMeal) => {
    const meals = [...plan.meals];
    meals[mealIdx] = meal;
    update({ ...plan, meals });
  };

  const removeMeal = (mealIdx: number) => {
    if (!window.confirm('Remover esta refeição?')) return;
    update({ ...plan, meals: plan.meals.filter((_, i) => i !== mealIdx) });
  };

  const addMeal = () => {
    update({
      ...plan,
      meals: [...plan.meals, { name: 'Nova refeição', items: [] }],
    });
  };

  return (
    <div id="meal-plan-section" className="bg-gradient-to-br from-blue-50/40 to-indigo-50/40 border border-blue-100 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm scroll-mt-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Utensils size={14} className="text-blue-600" />
          <h3 className="text-blue-700 font-black uppercase text-[10px] tracking-[0.2em]">
            Plano Sugerido
            {objective && (
              <span className="text-blue-500/80 font-bold normal-case tracking-normal ml-1.5">
                ({objective})
              </span>
            )}
          </h3>
        </div>
        {onSavePlan && (
          <button
            onClick={handleSave}
            disabled={saving || isAlreadySaved}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-colors ${
              isAlreadySaved
                ? 'bg-emerald-600 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-60'
            }`}
            title={isAlreadySaved ? 'Este plano já está salvo como ativo' : 'Salvar como plano ativo'}
          >
            {saving ? (
              <><Loader2 size={12} className="animate-spin" /> Salvando…</>
            ) : justSaved ? (
              <><Check size={12} /> Salvo!</>
            ) : isAlreadySaved ? (
              <><Check size={12} /> Plano ativo</>
            ) : (
              <><Save size={12} /> Salvar como plano ativo</>
            )}
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500 mb-5">
        💡 Sugestão da IA — revise antes de entregar à paciente. Clique em qualquer alimento para ver substituições.
      </p>

      {/* Macros */}
      {plan.macroEstimate && (
        <div className={`relative mb-5 bg-white rounded-xl border p-3 transition-colors ${
          macrosStale ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100'
        }`}>
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 transition-opacity ${
            macrosStale && !recalculating ? 'opacity-50' : ''
          }`}>
            {plan.macroEstimate.calories != null && (
              <MacroCell label="Calorias" value={`${plan.macroEstimate.calories} kcal`} />
            )}
            {plan.macroEstimate.protein && (
              <MacroCell label="Proteínas" value={plan.macroEstimate.protein} />
            )}
            {plan.macroEstimate.carbs && (
              <MacroCell label="Carbos" value={plan.macroEstimate.carbs} />
            )}
            {plan.macroEstimate.fat && (
              <MacroCell label="Gorduras" value={plan.macroEstimate.fat} />
            )}
          </div>
          {(macrosStale || recalculating) && onRecalculateMacros && (
            <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-bold">
                {recalculating ? (
                  <><Loader2 size={12} className="animate-spin" /> Recalculando macros…</>
                ) : autoRecalcArmed ? (
                  <><Loader2 size={12} className="animate-spin opacity-60" /> Atualizando macros automaticamente…</>
                ) : (
                  <><RefreshCw size={12} /> Macros desatualizados</>
                )}
              </div>
              {!recalculating && (
                <button
                  onClick={handleManualRecalc}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <RefreshCw size={11} /> Recalcular agora
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meals */}
      <div className="space-y-3">
        {plan.meals.map((meal, mealIdx) => (
          <MealSection
            key={mealIdx}
            meal={meal}
            onChange={(m) => updateMeal(mealIdx, m)}
            onRemove={() => removeMeal(mealIdx)}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={addMeal}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-dashed border-blue-300 transition-colors"
        >
          <Plus size={12} /> Adicionar refeição
        </button>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="mt-4 p-3 bg-white rounded-xl border border-slate-100">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
            Observações
          </div>
          <textarea
            value={plan.notes}
            onChange={(e) => update({ ...plan, notes: e.target.value })}
            className="w-full text-sm text-slate-700 bg-transparent resize-none outline-none"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

function MacroCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}

interface MealSectionProps {
  meal: StructuredMeal;
  onChange: (m: StructuredMeal) => void;
  onRemove: () => void;
}

function MealSection({ meal, onChange, onRemove }: MealSectionProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(meal.name);

  const updateItem = (i: number, item: StructuredMealItem) => {
    const items = [...meal.items];
    items[i] = item;
    onChange({ ...meal, items });
  };

  const removeItem = (i: number) => {
    onChange({ ...meal, items: meal.items.filter((_, j) => j !== i) });
  };

  const addItem = () => {
    onChange({
      ...meal,
      items: [...meal.items, { food: 'Novo item', category: 'outro', substitutions: [] }],
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onChange({ ...meal, name: nameValue.trim() || meal.name });
                    setEditingName(false);
                  }
                  if (e.key === 'Escape') {
                    setNameValue(meal.name);
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="text-sm font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-100 flex-1"
              />
              <button onClick={() => { onChange({ ...meal, name: nameValue.trim() || meal.name }); setEditingName(false); }} className="p-1 text-green-600 hover:bg-green-50 rounded">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {meal.name}
              </h4>
              {meal.time && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                  <Clock size={10} /> {meal.time}
                </span>
              )}
              <button onClick={() => { setNameValue(meal.name); setEditingName(true); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
                <Pencil size={11} />
              </button>
            </>
          )}
        </div>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
          <X size={14} />
        </button>
      </div>

      <ul className="space-y-1.5">
        {meal.items.map((item, i) => (
          <MealItemRow
            key={i}
            item={item}
            onChange={(it) => updateItem(i, it)}
            onRemove={() => removeItem(i)}
          />
        ))}
      </ul>

      <button
        onClick={addItem}
        className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700"
      >
        <Plus size={11} /> Adicionar item
      </button>
    </div>
  );
}

interface MealItemRowProps {
  item: StructuredMealItem;
  onChange: (it: StructuredMealItem) => void;
  onRemove: () => void;
}

function MealItemRow({ item, onChange, onRemove }: MealItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.food);
  const [openSubs, setOpenSubs] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close substitution dropdown
  useEffect(() => {
    if (!openSubs) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenSubs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openSubs]);

  const subs = item.substitutions || [];
  const hasSubs = subs.length > 0;

  return (
    <li ref={ref} className="relative group/item">
      <div className="flex items-start gap-2">
        <span className="text-blue-400 mt-1.5 text-[10px]">•</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onChange({ ...item, food: text.trim() || item.food });
                    setEditing(false);
                  }
                  if (e.key === 'Escape') {
                    setText(item.food);
                    setEditing(false);
                  }
                }}
                autoFocus
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button onClick={() => { onChange({ ...item, food: text.trim() || item.food }); setEditing(false); }} className="p-1 text-green-600 hover:bg-green-50 rounded">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => hasSubs && setOpenSubs((v) => !v)}
                className={`text-sm text-slate-800 text-left ${hasSubs ? 'underline decoration-dotted decoration-blue-300 underline-offset-4 hover:decoration-blue-500 cursor-pointer' : ''}`}
                title={hasSubs ? 'Ver substituições' : ''}
              >
                {item.food}
              </button>
              {hasSubs && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-500 px-1.5 py-0.5 bg-blue-50 rounded-full">
                  <Repeat size={9} /> {subs.length}
                </span>
              )}
              <button onClick={() => { setText(item.food); setEditing(true); }} className="opacity-0 group-hover/item:opacity-100 p-0.5 text-slate-300 hover:text-blue-600 transition-all">
                <Pencil size={11} />
              </button>
              <button onClick={onRemove} className="opacity-0 group-hover/item:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-all">
                <X size={11} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Substitution dropdown */}
      {openSubs && hasSubs && (
        <div className="absolute left-4 top-full mt-1 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Substituições equivalentes
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {subs.map((sub, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    // Swap: current food becomes a substitution, picked sub becomes the food
                    const newSubs = subs.map((s, j) => (j === i ? item.food : s));
                    onChange({ ...item, food: sub, substitutions: newSubs });
                    setOpenSubs(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-colors"
                >
                  {sub}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
