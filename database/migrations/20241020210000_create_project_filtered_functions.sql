-- Function to get expense stats filtered by project
CREATE OR REPLACE FUNCTION get_expense_stats_by_project(
    p_project_id INT,
    p_year INT DEFAULT NULL,
    p_month INT DEFAULT NULL,
    p_document_type VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    total_amount DECIMAL(12,2),
    recoverable_iva DECIMAL(12,2),
    materiales_amount DECIMAL(12,2),
    servicios_amount DECIMAL(12,2),
    epp_amount DECIMAL(12,2),
    combustible_amount DECIMAL(12,2),
    herramientas_amount DECIMAL(12,2),
    otros_amount DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
BEGIN
    -- Determine start and end dates based on p_year and p_month
    IF p_year IS NOT NULL AND p_month IS NOT NULL THEN
        -- Specific month and year
        start_date := make_date(p_year, p_month, 1);
        end_date := (start_date + INTERVAL '1 month') - INTERVAL '1 day';
    ELSIF p_year IS NOT NULL THEN
        -- Entire year
        start_date := make_date(p_year, 1, 1);
        end_date := make_date(p_year, 12, 31);
    ELSE
        -- All time (no date filter)
        start_date := NULL;
        end_date := NULL;
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(e.total_amount), 0)::DECIMAL(12,2) AS total_amount,
        COALESCE(SUM(CASE WHEN e.document_type = 'factura' AND e.status = 'active' THEN e.iva_amount ELSE 0 END), 0)::DECIMAL(12,2) AS recoverable_iva,
        COALESCE(SUM(CASE WHEN e.type = 'materiales' AND e.status = 'active' THEN e.total_amount ELSE 0 END), 0)::DECIMAL(12,2) AS materiales_amount,
        COALESCE(SUM(CASE WHEN e.type = 'servicios' AND e.status = 'active' THEN e.total_amount ELSE 0 END), 0)::DECIMAL(12,2) AS servicios_amount,
        COALESCE(SUM(CASE WHEN e.type = 'epp' AND e.status = 'active' THEN e.total_amount ELSE 0 END), 0)::DECIMAL(12,2) AS epp_amount,
        COALESCE(SUM(CASE WHEN e.type = 'combustible' AND e.status = 'active' THEN e.total_amount ELSE 0 END), 0)::DECIMAL(12,2) AS combustible_amount,
        COALESCE(SUM(CASE WHEN e.type = 'herramientas' AND e.status = 'active' THEN e.total_amount ELSE 0 END), 0)::DECIMAL(12,2) AS herramientas_amount,
        COALESCE(SUM(CASE WHEN e.type = 'otros' AND e.status = 'active' THEN e.total_amount ELSE 0 END), 0)::DECIMAL(12,2) AS otros_amount
    FROM
        expenses e
    WHERE
        e.status = 'active'
        AND e.project_id = p_project_id
        AND (start_date IS NULL OR e.date BETWEEN start_date AND end_date)
        AND (p_document_type IS NULL OR e.document_type = p_document_type);
END;
$$;

-- Update existing monthly functions to support project filtering
CREATE OR REPLACE FUNCTION get_expense_stats_by_document_type_monthly(
    p_year INT,
    p_project_id INT DEFAULT NULL
)
RETURNS TABLE (
    month INT,
    document_type VARCHAR(50),
    total_amount DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(MONTH FROM e.date)::INT AS month,
        e.document_type,
        COALESCE(SUM(e.total_amount), 0)::DECIMAL(12,2) AS total_amount
    FROM
        expenses e
    WHERE
        EXTRACT(YEAR FROM e.date) = p_year
        AND e.status = 'active'
        AND (p_project_id IS NULL OR e.project_id = p_project_id)
    GROUP BY
        EXTRACT(MONTH FROM e.date),
        e.document_type
    ORDER BY
        month,
        e.document_type;
END;
$$;

CREATE OR REPLACE FUNCTION get_expense_stats_by_category_monthly(
    p_year INT,
    p_project_id INT DEFAULT NULL
)
RETURNS TABLE (
    month INT,
    expense_type VARCHAR(50),
    total_amount DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(MONTH FROM e.date)::INT AS month,
        e.type AS expense_type,
        COALESCE(SUM(e.total_amount), 0)::DECIMAL(12,2) AS total_amount
    FROM
        expenses e
    WHERE
        EXTRACT(YEAR FROM e.date) = p_year
        AND e.status = 'active'
        AND (p_project_id IS NULL OR e.project_id = p_project_id)
    GROUP BY
        EXTRACT(MONTH FROM e.date),
        e.type
    ORDER BY
        month,
        expense_type;
END;
$$;
