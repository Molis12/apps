import { Card, IconButton } from '@contentful/f36-components';
import { CloseIcon } from '@contentful/f36-icons';
import { css } from 'emotion';
import arrayMove from 'array-move';
import * as React from 'react';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { Asset, Config, DeleteFn, ThumbnailFn } from '../interfaces';

interface Props {
  disabled: boolean;
  onChange: (data: Asset[]) => void;
  config: Config;
  resources: Asset[];
  makeThumbnail: ThumbnailFn;
}

interface SortableContainerProps {
  disabled: boolean;
  config: Config;
  resources: Asset[];
  deleteFn: DeleteFn;
  makeThumbnail: ThumbnailFn;
}

interface DragHandleProps {
  url: string | undefined;
  alt: string | undefined;
}

interface SortableElementProps extends DragHandleProps {
  disabled: boolean;
  onDelete: () => void;
}

const DragHandle = SortableHandle<DragHandleProps>(({ url, alt }: DragHandleProps) =>
  url ? <img src={url} alt={alt} /> : <div>Asset not available</div>
);

const styles = {
  container: css({
    maxWidth: '600px',
  }),
  grid: css({
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(3, 1fr)',
  }),
  card: (disabled: boolean) =>
    css({
      margin: '10px',
      position: 'relative',
      img: {
        cursor: disabled ? 'move' : 'pointer',
        display: 'block',
        maxWidth: '150px',
        maxHeight: '100px',
        margin: 'auto',
        userSelect: 'none', // Image selection sometimes makes drag and drop ugly.
      },
    }),
  remove: css({
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    backgroundColor: 'white',
    padding: 0,
    minHeight: 'initial',
  }),
};

const SortableItem = SortableElement<SortableElementProps>((props: SortableElementProps) => {
  return (
    <Card className={styles.card(props.disabled)}>
      <DragHandle url={props.url} alt={props.alt} />
      {!props.disabled && (
        <IconButton
          variant="transparent"
          icon={<CloseIcon variant="muted" />}
          aria-label="Close"
          onClick={props.onDelete}
          className={styles.remove}
        />
      )}
    </Card>
  );
});

const SortableList = SortableContainer<SortableContainerProps>((props: SortableContainerProps) => {
  // Provide stable keys for all resources so images don't blink.
  const { list } = props.resources.reduce(
    (acc, resource, index) => {
      const [url, alt] = props.makeThumbnail(resource, props.config);
      const item = { url, alt, key: `url-unknown-${index}` };
      const counts = { ...acc.counts };

      // URLs are used as keys.
      // It is possible to include the same image more than once.
      // We count usages of the same URL and use the count in keys.
      // This can be considered an edge-case but still - should be covered.
      if (url) {
        counts[url] = counts[url] || 1;
        item.key = [url, counts[url]].join('-');
        counts[url] += 1;
      }

      return {
        counts,
        list: [...acc.list, item],
      };
    },
    { counts: {}, list: [] }
  ) as { list: Asset[] };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {list.map(({ url, alt, key }, index) => {
          return (
            <SortableItem
              disabled={props.disabled}
              key={key}
              url={url}
              alt={alt}
              index={index}
              onDelete={() => props.deleteFn(index)}
            />
          );
        })}
      </div>
    </div>
  );
});

export class SortableComponent extends React.Component<Props> {
  onSortEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
    const resources = arrayMove(this.props.resources, oldIndex, newIndex);
    this.props.onChange(resources);
  };

  deleteItem = (index: number) => {
    const resources = [...this.props.resources];
    resources.splice(index, 1);
    this.props.onChange(resources);
  };

  render() {
    return (
      <SortableList
        disabled={this.props.disabled}
        onSortStart={(_, e) => e.preventDefault()} // Fixes FF glitches.
        onSortEnd={this.onSortEnd}
        axis="xy"
        resources={this.props.resources}
        config={this.props.config}
        deleteFn={this.deleteItem}
        useDragHandle
        makeThumbnail={this.props.makeThumbnail}
      />
    );
  }
}
