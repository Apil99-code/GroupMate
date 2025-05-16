import { Bar, Pie } from 'react-chartjs-2';
import PropTypes from 'prop-types';

const ExpenseChart = ({ type, data, options, height }) => {
  const ChartComponent = type === 'bar' ? Bar : Pie;

  return (
    <div style={{ height: height || '300px' }}>
      <ChartComponent data={data} options={options} />
    </div>
  );
};

ExpenseChart.propTypes = {
  type: PropTypes.oneOf(['bar', 'pie']).isRequired,
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string),
    datasets: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  options: PropTypes.object,
  height: PropTypes.string
};

ExpenseChart.defaultProps = {
  options: {},
  height: '300px'
};

export default ExpenseChart; 