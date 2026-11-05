"""Guard conclusions about numeric insertions and paired OCR regressions."""
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('candidate',Path(__file__).resolve().parents[1]/'evaluate_candidate.py')
candidate=importlib.util.module_from_spec(spec);spec.loader.exec_module(candidate)


class MetricsTests(unittest.TestCase):
    def test_invented_numbers_are_not_scored_as_correct(self):
        result=candidate.measure('Clinical summary','Clinical summary 16')
        self.assertTrue(result['invented_numbers'])
        self.assertFalse(result['numeric_exact'])
        self.assertFalse(result['exact'])

    def test_preserve_important_punctuation_and_number_order(self):
        self.assertFalse(candidate.measure('0.5 mg','5 mg')['numeric_exact'])
        self.assertFalse(candidate.measure('23 36','36 23')['numeric_exact'])
        self.assertTrue(candidate.measure('Rebond #23',' REBOND  #23 ')['exact'])

    def test_pairing_rejects_different_evaluation_cases(self):
        rows=[dict(config='baseline',image='a',repeat=0,condition='original'),
              dict(config='candidate',image='b',repeat=0,condition='original')]
        with self.assertRaises(ValueError):candidate.compare(rows,'original','candidate')

    def test_counts_losses_even_if_other_lines_improve(self):
        def row(config,image,reference,prediction):
            return dict(config=config,image=image,repeat=0,condition='original',**candidate.measure(reference,prediction))
        rows=[row('baseline','a','No payment','No payment'),row('candidate','a','No payment','No payment 5'),
              row('baseline','b','Resto #23','Resto'),row('candidate','b','Resto #23','Resto #23')]
        r=candidate.compare(rows,'original','candidate')
        self.assertEqual((r['lost_exact'],r['gained_exact'],r['numeric_regressions'],r['numeric_improvements']),(1,1,1,1))


if __name__=='__main__':unittest.main()
