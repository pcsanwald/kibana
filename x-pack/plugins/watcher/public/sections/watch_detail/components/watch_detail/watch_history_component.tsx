/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import React, { useEffect, useState } from 'react';

import { fetchWatchDetail, fetchWatchHistory, fetchWatchHistoryDetail } from '../../../../lib/api';

import { i18n } from '@kbn/i18n';
import { WATCH_STATES } from '../../../../../common/constants';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

// TODO: remove duplication, [pcs]
const stateToIcon: { [key: string]: JSX.Element } = {
  [WATCH_STATES.OK]: <EuiIcon type="check" color="green" />,
  [WATCH_STATES.DISABLED]: <EuiIcon type="minusInCircle" color="grey" />,
  [WATCH_STATES.FIRING]: <EuiIcon type="play" color="primary" />,
  [WATCH_STATES.ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
  [WATCH_STATES.CONFIG_ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
};

const WatchHistoryUI = ({ intl, watchId }: { intl: InjectedIntl; watchId: string }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [history, setWatchHistory] = useState([]);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(true);
  const [itemDetail, setItemDetail] = useState<{
    id?: string;
    details?: any;
    watchId?: string;
    watchStatus?: { actionStatuses?: any };
  }>({});
  const [watch, setWatch] = useState({});

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 50, 100],
  };

  const columns = [
    {
      field: 'startTime',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.startTimeHeader', {
        defaultMessage: 'Trigger Time',
      }),
      sortable: true,
      truncateText: true,
      render: (startTime: Moment, item: any) => {
        const formattedDate = startTime.format();
        // "#/management/elasticsearch/watcher/watches/watch/{{watchHistoryTable.watch.id}}/history-item/{{item.historyItem.id}}"
        // href={`#/management/elasticsearch/watcher/watches/watch/${watchId}/history-item/${watchId}`}
        return (
          <EuiLink
            className="indTable__link euiTableCellContent"
            data-test-subj={`watchIdColumn-${formattedDate}`}
            onClick={() => showDetailFlyout(item)}
          >
            {formattedDate}
          </EuiLink>
        );
      },
    },
    {
      field: 'watchStatus.state',
      name: i18n.translate('xpack.watcher.sections.watchHistory.watchTable.stateHeader', {
        defaultMessage: 'State',
      }),
      sortable: true,
      truncateText: true,
      render: (state: string) => {
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>{stateToIcon[state]}</EuiFlexItem>
            <EuiFlexItem grow={false} className="watchState__message">
              <EuiText>{state}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'watchStatus.comment',
      name: i18n.translate('xpack.watcher.sections.watchHistory.watchTable.commentHeader', {
        defaultMessage: 'Comment',
      }),
      sortable: true,
      truncateText: true,
      render: (comment: string) => {
        return <EuiText>{comment}</EuiText>;
      },
    },
  ];
  const loadWatchHistory = async () => {
    // TODO[pcs]: this is a duplicate call, pass this down to component
    // we need the watch detail here because it contains types for actions
    const loadedWatch = await fetchWatchDetail(watchId);
    setWatch(loadedWatch);
    const loadedWatchHistory = await fetchWatchHistory(watchId, 'now-1h');
    setWatchHistory(loadedWatchHistory);
    setIsLoading(false);
  };

  const hideDetailFlyout = async () => {
    setItemDetail({});
    return setIsDetailVisible(false);
  };

  const showDetailFlyout = async (item: { id: string }) => {
    const watchHistoryItemDetail = await fetchWatchHistoryDetail(item.id);
    setItemDetail(watchHistoryItemDetail);
    return setIsDetailVisible(true);
  };

  useEffect(() => {
    loadWatchHistory();
    // only run the first time the component loads
  }, []);

  let flyout;

  if (isDetailVisible && Object.keys(itemDetail).length !== 0) {
    const detailColumns = [
      {
        field: 'id',
        name: i18n.translate('xpack.watcher.sections.watchList.watchActionStatusTable.id', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: true,
        render: (id: string) => {
          return <EuiText>{id}</EuiText>;
        },
      },
      {
        field: 'state',
        name: i18n.translate('xpack.watcher.sections.watchList.watchActionStatusTable.id', {
          defaultMessage: 'State',
        }),
        sortable: true,
        truncateText: true,
        render: (state: string) => {
          return <EuiText>{state}</EuiText>;
        },
      },
    ];

    const executionDetails = JSON.stringify(itemDetail.details, null, 2);
    flyout = (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={hideDetailFlyout}
        aria-labelledby="indexDetailsFlyoutTitle"
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>Watch History Detail</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem>
            {/* TODO[pcs] this `as any` kind of casting is a bit of a hack */}
            <EuiInMemoryTable
              items={(itemDetail.watchStatus as any).actionStatuses}
              itemId="id"
              columns={detailColumns}
              message={
                <FormattedMessage
                  id="xpack.watcher.sections.watchDetail.watchTable.noWatchesMessage"
                  defaultMessage="No current status to show"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem>
            <EuiCodeBlock language="javascript">{executionDetails}</EuiCodeBlock>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyout>
    );
  }
  return (
    <EuiPageContent>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.watcher.sections.watchDetail.header"
                defaultMessage="Watch History"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiInMemoryTable
            items={history}
            itemId="id"
            columns={columns}
            pagination={pagination}
            sorting={true}
            loading={isLoading}
            message={
              <FormattedMessage
                id="xpack.watcher.sections.watchDetail.watchTable.noWatchesMessage"
                defaultMessage="No current status to show"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {flyout}
    </EuiPageContent>
  );
};

export const WatchHistory = injectI18n(WatchHistoryUI);
