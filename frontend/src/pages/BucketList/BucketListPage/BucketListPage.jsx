import { useEffect, useMemo, useState } from "react";
import BackHeader from "../../../components/common/BackHeader/BackHeader";
import BucketProgress from "../../../components/bucket/BucketProgress/BucketProgress";
import AddBucketItem from "../../../components/bucket/AddBucketItem/AddBucketItem";
import BucketItemCard from "../../../components/bucket/BucketItemCard/BucketItemCard";
import {
  getBucketItems,
  addBucketItem,
  toggleBucketItem,
  deleteBucketItem,
} from "../../../services/bucket.service";
import "./BucketListPage.css";

const BucketListPage = () => {
  const [items, setItems] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    getBucketItems()
      .then((res) => alive && setItems(res.data || []))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const list = items || [];
    const total = list.length;
    const completed = list.filter((i) => i.completed).length;
    return {
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }, [items]);

  const handleAdd = async (data) => {
    const res = await addBucketItem(data);
    setItems((prev) => [res.data, ...(prev || [])]);
  };

  // Optimistic toggle — flip locally, reconcile/revert on the server response.
  const handleToggle = async (item) => {
    const next = !item.completed;
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, completed: next } : i)),
    );
    try {
      const res = await toggleBucketItem(item._id, next);
      setItems((prev) => prev.map((i) => (i._id === item._id ? res.data : i)));
    } catch {
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, completed: !next } : i)),
      );
    }
  };

  const handleDelete = async (item) => {
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i._id !== item._id));
    try {
      await deleteBucketItem(item._id);
    } catch {
      setItems(snapshot); // revert
    }
  };

  // Sort: incomplete first, then by created (server already does, but keep stable
  // after optimistic edits).
  const sorted = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [items]);

  return (
    <div className="bucketpage">
      <BackHeader title="Bucket List" subtitle="Dreams you'll chase together" fallback="/dashboard" />

      <div className="bucketpage__body">
        <div className="bucketpage__hero">
          <BucketProgress percent={stats.percent} completed={stats.completed} total={stats.total} />
          <div className="bucketpage__hero-text">
            <h2 className="bucketpage__hero-pct">{stats.percent}% Complete</h2>
            <p className="bucketpage__hero-sub">
              {stats.total === 0
                ? "Start your list — what's your first dream together?"
                : stats.percent === 100
                  ? "You did it all — dream bigger! 💫"
                  : `${stats.total - stats.completed} goal${stats.total - stats.completed === 1 ? "" : "s"} to go. Keep going! 💪`}
            </p>
          </div>
        </div>

        <AddBucketItem onAdd={handleAdd} />

        {items === null && !error && (
          <div className="bucketpage__skeletons">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bucketpage__sk" />
            ))}
          </div>
        )}

        {error && <p className="bucketpage__error">Couldn't load your bucket list. Try again later.</p>}

        {items !== null && sorted.length === 0 && (
          <div className="bucketpage__empty">
            <span className="bucketpage__empty-emoji">🪣</span>
            <p>No goals yet. Add your first shared dream above!</p>
          </div>
        )}

        <div className="bucketpage__list">
          {sorted.map((item) => (
            <BucketItemCard
              key={item._id}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BucketListPage;
