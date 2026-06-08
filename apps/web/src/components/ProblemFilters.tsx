import { Input, Select, Slider, Space } from 'antd';
import { useTranslation } from 'react-i18next';

export interface ProblemFilterValues {
  keyword: string;
  tags: string[];
  difficultyRange: [number, number];
}

interface ProblemFiltersProps {
  values: ProblemFilterValues;
  onChange: (values: ProblemFilterValues) => void;
  availableTags?: string[];
}

const DIFFICULTY_MIN = 0;
const DIFFICULTY_MAX = 5000;

export function ProblemFilters({
  values,
  onChange,
  availableTags = [],
}: ProblemFiltersProps) {
  const { t } = useTranslation();

  const update = (partial: Partial<ProblemFilterValues>) => {
    onChange({ ...values, ...partial });
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
      <Input.Search
        placeholder={t('problems.searchPlaceholder', '搜索题目标题或编号')}
        allowClear
        value={values.keyword}
        onChange={(e) => update({ keyword: e.target.value })}
        onSearch={(v) => update({ keyword: v })}
        style={{ maxWidth: 400 }}
      />
      <Space wrap>
        <Select
          mode="multiple"
          placeholder={t('problems.filterTags', '按标签筛选')}
          value={values.tags}
          onChange={(tags) => update({ tags })}
          style={{ minWidth: 200, maxWidth: 400 }}
          allowClear
          options={availableTags.map((tag) => ({ label: tag, value: tag }))}
        />
        <div style={{ minWidth: 240 }}>
          <span style={{ fontSize: 12, color: '#888' }}>
            {t('problems.filterDifficulty', '难度区间')}
          </span>
          <Slider
            range
            min={DIFFICULTY_MIN}
            max={DIFFICULTY_MAX}
            step={100}
            value={values.difficultyRange}
            onChange={(range) => update({ difficultyRange: range as [number, number] })}
          />
        </div>
      </Space>
    </Space>
  );
}
