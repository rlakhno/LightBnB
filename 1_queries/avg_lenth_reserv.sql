-- avg_lenth_reserv
SELECT avg(end_date - start_date) as average_duration
FROM reservations;