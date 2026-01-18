import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight } from '@fortawesome/free-solid-svg-icons';
import './Pagination.css';

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 10,
    showInfo = true
}) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="pagination-container">
            {showInfo && totalItems > 0 && (
                <div className="pagination-info">
                    Showing {startItem}-{endItem} of {totalItems}
                </div>
            )}

            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="First page"
                >
                    <FontAwesomeIcon icon={faAnglesLeft} />
                </button>

                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Previous page"
                >
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                {getPageNumbers().map(page => (
                    <button
                        key={page}
                        className={`pagination-btn page-number ${currentPage === page ? 'active' : ''}`}
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </button>
                ))}

                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Next page"
                >
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>

                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                >
                    <FontAwesomeIcon icon={faAnglesRight} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
