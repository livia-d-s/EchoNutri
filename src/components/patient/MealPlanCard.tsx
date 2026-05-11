import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Utensils, Plus, X, Pencil, Check, Repeat, Save, Loader2, Clock } from 'lucide-react';
import { StructuredMealPlan, StructuredMeal, StructuredMealItem } from '../../../types';

interface MealPlanCardProps {
  plan: StructuredMealPlan;
  onChange: (next: StructuredMealPlan) => void;
  onSavePlan?: () => Promise<void> | void;     // "Tornar prescrição vigente"
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
  const [justSaved, setJustSaved] = useState(false);
  const baselineRef = useRef<string>(planSignature(plan));
  const debounceRef = useRef<number | null>(null);

  // Reset baseline whenever macros are refreshed (parent updates plan.macroEstimate after recalc/generate).
  const macroId = useMemo(() => JSON.stringify(plan.macroEstimate || null), [plan.macroEstimate]);
  useEffect(() => {
    baselineRef.current = planSignature(plan);
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
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setRecalculating(true);
      try {
        await onRecalculateMacros();
      } catch {
        /* parent surfaces the error; baselineRef stays stale until next attempt */
      } finally {
        setRecalculating(false);
      }
    }, 1500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSig, macrosStale, pendingPlaceholder]);

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
    <div id="meal-plan-section" className="bg-surface border border-line rounded-lg p-5 md:p-6 shadow-xs scroll-mt-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Utensils size={14} className="text-brand-700" strokeWidth={2.25} />
          <h3 className="text-ink-secondary font-semibold uppercase text-2xs tracking-[0.1em]">
            Prescrição nutricional
            {objective && (
              <span className="text-ink-tertiary font-medium normal-case tracking-normal ml-1.5">
                · {objective}
              </span>
            )}
          </h3>
        </div>
        {onSavePlan && (
          <button
            onClick={handleSave}
            disabled={saving || isAlreadySaved}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-md transition-colors ${
              isAlreadySaved
                ? 'bg-positive cursor-default'
                : 'bg-brand-700 hover:bg-brand-900 disabled:opacity-60'
            }`}
            title={isAlreadySaved ? 'Esta prescrição já está vigente' : 'Tornar prescrição vigente'}
          >
            {saving ? (
              <><Loader2 size={12} className="animate-spin" /> Salvando…</>
            ) : justSaved ? (
              <><Check size={12} /> Vigente</>
            ) : isAlreadySaved ? (
              <><Check size={12} /> Prescrição vigente</>
            ) : (
              <><Save size={12} /> Tornar vigente</>
            )}
          </button>
        )}
      </div>

      <p className="text-2xs text-ink-tertiary mb-5">
        Análise interpretativa — revise antes de entregar. Clique em qualquer item para ver substituições equivalentes.
      </p>

      {/* Macros */}
      {plan.macroEstimate && (
        <div className="relative mb-5 bg-subtle/40 rounded-md border border-line p-3">
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 transition-opacity ${
            recalculating ? 'opacity-50' : ''
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
          {recalculating && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70 rounded-md">
              <div className="flex items-center gap-1.5 text-2xs text-ink-primary font-semibold bg-surface px-3 py-1.5 rounded-md shadow-xs border border-line">
                <Loader2 size={12} className="animate-spin text-brand-700" /> Atualizando valores nutricionais
              </div>
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-subtle text-ink-primary text-xs font-semibold rounded-md border border-dashed border-line hover:border-brand-700 transition-colors"
        >
          <Plus size={12} strokeWidth={2.25} className="text-brand-700" /> Adicionar refeição
        </button>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="mt-4 p-3 bg-white rounded-xl border border-slate-100">
          <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1">
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
      <div className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">{label}</div>
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
    <div className="bg-subtle/40 rounded-md border border-line p-4 group">
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
                className="text-sm font-semibold text-ink-primary bg-surface border border-line rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 flex-1"
              />
              <button onClick={() => { onChange({ ...meal, name: nameValue.trim() || meal.name }); setEditingName(false); }} className="p-1 text-positive hover:bg-green-50 rounded-sm">
                <Check size={12} strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-semibold text-ink-primary uppercase tracking-[0.08em]">
                {meal.name}
              </h4>
              {meal.time && (
                <span className="inline-flex items-center gap-1 text-2xs text-ink-tertiary font-medium font-mono">
                  <Clock size={10} strokeWidth={2.25} /> {meal.time}
                </span>
              )}
              <button onClick={() => { setNameValue(meal.name); setEditingName(true); }} className="opacity-0 group-hover:opacity-100 p-1 text-ink-tertiary hover:text-brand-700 hover:bg-subtle rounded-sm transition-all">
                <Pencil size={11} strokeWidth={2.25} />
              </button>
            </>
          )}
        </div>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 text-ink-tertiary hover:text-critical hover:bg-red-50 rounded-sm transition-all">
          <X size={14} strokeWidth={2.25} />
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
        className="mt-2.5 flex items-center gap-1.5 text-2xs font-semibold text-brand-700 hover:text-brand-900"
      >
        <Plus size={11} strokeWidth={2.25} /> Adicionar item
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
        <span className="text-ink-tertiary mt-1.5 text-2xs">•</span>
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
                className="flex-1 text-sm bg-surface text-ink-primary border border-line rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
              />
              <button onClick={() => { onChange({ ...item, food: text.trim() || item.food }); setEditing(false); }} className="p-1 text-positive hover:bg-green-50 rounded-sm">
                <Check size={12} strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => hasSubs && setOpenSubs((v) => !v)}
                className={`text-sm text-ink-primary text-left ${hasSubs ? 'underline decoration-dotted decoration-brand-700/40 underline-offset-4 hover:decoration-brand-700 cursor-pointer' : ''}`}
                title={hasSubs ? 'Ver substituições' : ''}
              >
                {item.food}
              </button>
              {hasSubs && (
                <span className="inline-flex items-center gap-0.5 text-2xs font-semibold text-brand-700 px-1.5 py-0.5 bg-subtle border border-line rounded-md">
                  <Repeat size={9} strokeWidth={2.25} /> {subs.length}
                </span>
              )}
              <button onClick={() => { setText(item.food); setEditing(true); }} className="opacity-0 group-hover/item:opacity-100 p-0.5 text-ink-tertiary hover:text-brand-700 transition-all">
                <Pencil size={11} strokeWidth={2.25} />
              </button>
              <button onClick={onRemove} className="opacity-0 group-hover/item:opacity-100 p-0.5 text-ink-tertiary hover:text-critical transition-all">
                <X size={11} strokeWidth={2.25} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Substitution dropdown */}
      {openSubs && hasSubs && (
        <div className="absolute left-4 top-full mt-1 z-20 w-64 bg-surface border border-line rounded-md shadow-md overflow-hidden">
          <div className="px-3 py-2 bg-subtle border-b border-line">
            <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-secondary">
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
                  className="w-full text-left px-3 py-2 text-sm text-ink-primary hover:bg-subtle transition-colors"
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
