from pathlib import Path
import subprocess
import sys

SCRIPT=Path(__file__).parents[1]/'configure-ocr.py'

def configure(tmp_path,settings):
    folder=tmp_path/'scripts';folder.mkdir()
    target=folder/'configure-ocr.py';target.write_text(SCRIPT.read_text(encoding='utf-8'),encoding='utf-8')
    env=tmp_path/'.env';env.write_text(settings,encoding='utf-8')
    result=subprocess.run([sys.executable,str(target)],cwd=folder,capture_output=True,text=True)
    return result,env,target


def test_configure_adds_only_private_token_and_preserves_existing_keys(tmp_path):
    original='FILE_ENCRYPTION_KEY=fictional-preserve-key\nPOSTGRES_PASSWORD=fictional-preserve-password\n'
    result,env,target=configure(tmp_path,original)
    assert result.returncode==0
    after=env.read_text(encoding='utf-8');assert after.startswith(original)
    token=next(line.split('=',1)[1] for line in after.splitlines() if line.startswith('OCR_TOKEN='))
    assert len(token)>=32 and token not in result.stdout+result.stderr
    again=subprocess.run([sys.executable,str(target)],capture_output=True,text=True)
    assert again.returncode==0 and env.read_text(encoding='utf-8')==after


def test_existing_invalid_token_is_not_replaced(tmp_path):
    original='OCR_TOKEN=too-short\nFILE_ENCRYPTION_KEY=fictional-preserve\n'
    result,env,_=configure(tmp_path,original)
    assert result.returncode!=0 and env.read_text(encoding='utf-8')==original


def test_duplicate_tokens_are_not_rewritten(tmp_path):
    original='OCR_TOKEN=fictional-one\nOCR_TOKEN=fictional-two\n'
    result,env,_=configure(tmp_path,original)
    assert result.returncode!=0 and env.read_text(encoding='utf-8')==original
