/**
 * src/features/onboarding/components/EquipmentStep.tsx
 *
 * Free-text equipment list as chips (brief: "up to 20 items; letters,
 * numbers, spaces and hyphens only").
 *
 *   [ Add an item          ]      text field; "done" on the keyboard adds it
 *   (+ Add)                       soft button, for people who don't use the keyboard key
 *   Your equipment  3 of 20       counter in tabular digits
 *   (x dumbbells) (x yoga mat)    selected-style chips; tap one to remove it
 *   Suggestions
 *   (kettlebell) (pull-up bar)    one tap adds a common item
 *
 * Each typed item is checked with the same rules as the server before it is
 * added (see ../schema.ts addEquipmentItem); the problem is shown under the
 * field. A server 422 for the whole list arrives as `error`.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { Plus, X } from 'lucide-react-native';

import { Button, Chip, Input, Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

import { EQUIPMENT_SUGGESTIONS } from '../labels';
import { addEquipmentItem, EQUIPMENT_MAX_ITEMS } from '../schema';
import { FieldMessage } from './FieldMessage';

export type EquipmentStepProps = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Error for the list as a whole (e.g. from a server 422). */
  error?: string;
};

export function EquipmentStep({ value, onChange, error }: EquipmentStepProps) {
  // What is typed but not yet added, and the problem with it (if any).
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | undefined>();

  const styles = useThemedStyles((t) => ({
    // Field + add button form one group (12 px apart); the list and the
    // suggestions are separate groups with a section gap (32) above each.
    addGroup: { gap: t.spacing[12] },
    // The add button hugs its label instead of stretching across the column.
    addButton: { alignSelf: 'flex-start' },
    section: { marginTop: t.layout.sectionGap },
    // Section heading row: label on the left, counter on the right.
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: t.spacing[12],
    },
    // Chips wrap onto new lines with 8 px between them both ways.
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[8] },
  }));

  const add = (raw: string) => {
    const result = addEquipmentItem(value, raw);
    if (!result.ok) {
      setDraftError(result.error);
      return false;
    }
    onChange(result.list);
    setDraftError(undefined);
    return true;
  };

  const addDraft = () => {
    if (add(draft)) setDraft('');
  };

  const remove = (item: string) => {
    onChange(value.filter((i) => i !== item));
    setDraftError(undefined);
  };

  const suggestions = EQUIPMENT_SUGGESTIONS.filter((s) => !value.includes(s));
  const full = value.length >= EQUIPMENT_MAX_ITEMS;

  return (
    <View>
      <View style={styles.addGroup}>
        <Input
          label="Add an item"
          placeholder="For example, dumbbells"
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            if (draftError) setDraftError(undefined);
          }}
          error={draftError}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          // Keep the keyboard open after adding, so several items can be typed in a row.
          submitBehavior="submit"
          onSubmitEditing={addDraft}
          maxLength={60}
          editable={!full}
        />
        <Button
          label="Add"
          icon={Plus}
          variant="soft"
          size="sm"
          onPress={addDraft}
          disabled={draft.trim().length === 0 || full}
          style={styles.addButton}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="bodyStrong">Your equipment</Text>
          <Text variant="caption" color="textSecondary" tabular>
            {value.length} of {EQUIPMENT_MAX_ITEMS}
          </Text>
        </View>
        {value.length > 0 ? (
          <View style={styles.chips}>
            {value.map((item) => (
              <Chip
                key={item}
                label={item}
                icon={X}
                selected
                onPress={() => remove(item)}
                accessibilityLabel={`Remove ${item}`}
              />
            ))}
          </View>
        ) : (
          <Text variant="callout" color="textSecondary">
            Nothing added yet
          </Text>
        )}
        <FieldMessage message={error} />
      </View>

      {suggestions.length > 0 && !full ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="bodyStrong">Suggestions</Text>
          </View>
          <View style={styles.chips}>
            {suggestions.map((item) => (
              <Chip
                key={item}
                label={item}
                icon={Plus}
                onPress={() => add(item)}
                accessibilityLabel={`Add ${item}`}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
